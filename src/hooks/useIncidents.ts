"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { ChatMessage, Incident, IncidentType, UserRole } from "@/types";

const fallbackIncidents: Incident[] = [
  {
    id: "mock-1",
    type: "fire",
    status: "pending",
    priority: "high",
    guestId: "guest-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    location: { lat: 25.2048, lng: 55.2708, label: "Palm Suites" },
    notes: "Alarm triggered on level 12"
  },
  {
    id: "mock-2",
    type: "medical",
    status: "acknowledged",
    priority: "medium",
    guestId: "guest-2",
    assignedStaffId: "staff-5",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    location: { lat: 25.199, lng: 55.27, label: "Spa Wing" },
    notes: "Guest reported dizziness"
  }
];

const toIsoString = (value: unknown) => {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "object" && "toDate" in (value as { toDate: () => Date })) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
};

export function useIncidents(role: UserRole, userId?: string) {
  const [incidents, setIncidents] = useState<Incident[]>(fallbackIncidents);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [loading, setLoading] = useState(true);
  const firestore = db;

  const hydrateGuestEmails = useCallback(
    async (baseIncidents: Incident[]) => {
      if (!firestore || baseIncidents.length === 0) return baseIncidents;

      const uniqueGuestIds = Array.from(new Set(baseIncidents.map((incident) => incident.guestId).filter(Boolean)));
      if (uniqueGuestIds.length === 0) return baseIncidents;

      const guestEmailById = new Map<string, string>();
      await Promise.all(
        uniqueGuestIds.map(async (guestId) => {
          try {
            const userSnap = await getDoc(doc(firestore, "users", guestId));
            if (!userSnap.exists()) return;
            const userData = userSnap.data() as { email?: string };
            if (userData.email) {
              guestEmailById.set(guestId, userData.email);
            }
          } catch {
            // Best-effort hydration; keep incident visible even if user lookup fails.
          }
        })
      );

      return baseIncidents.map((incident) => {
        if (incident.guestEmail) return incident;
        const hydratedEmail = guestEmailById.get(incident.guestId);
        return hydratedEmail ? { ...incident, guestEmail: hydratedEmail } : incident;
      });
    },
    [firestore]
  );

  useEffect(() => {
    if (!firestore) {
      setIncidents(fallbackIncidents);
      setLoading(false);
      return () => undefined;
    }

    const baseQuery = query(collection(firestore, "incidents"), orderBy("createdAt", "desc"));
    let active = true;
    const unsubscribe = onSnapshot(
      baseQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setIncidents(fallbackIncidents);
          setLoading(false);
          return;
        }

        const result: Incident[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Incident;
          return {
            ...data,
            id: docSnap.id,
            createdAt: toIsoString(data.createdAt),
            updatedAt: toIsoString(data.updatedAt)
          };
        });

        void hydrateGuestEmails(result)
          .then((hydrated) => {
            if (!active) return;
            setIncidents(hydrated);
            setLoading(false);
          })
          .catch(() => {
            if (!active) return;
            setIncidents(result);
            setLoading(false);
          });
      },
      () => {
        setIncidents(fallbackIncidents);
        setLoading(false);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [firestore, hydrateGuestEmails]);

  useEffect(() => {
    if (!userId || !firestore) return;
    const chatQuery = query(collection(firestore, "chats"), where("participants", "array-contains", userId));

    const unsubscribe = onSnapshot(chatQuery, (snapshot) => {
      const nextMessages: Record<string, ChatMessage[]> = {};
      snapshot.docs.forEach((docSnap) => {
        const convo = docSnap.data() as { incidentId: string; messages: ChatMessage[] };
        nextMessages[convo.incidentId] = convo.messages || [];
      });
      setMessages(nextMessages);
    });

    return () => unsubscribe();
  }, [firestore, userId]);

  const createIncident = useCallback(
    async (type: IncidentType, guestLocation: Incident["location"], notes?: string) => {
      if (!userId) throw new Error("Authentication required");
      if (!firestore) throw new Error("Firestore unavailable");
      let guestEmail = auth?.currentUser?.email ?? undefined;
      if (!guestEmail) {
        try {
          const userSnap = await getDoc(doc(firestore, "users", userId));
          if (userSnap.exists()) {
            const userData = userSnap.data() as { email?: string };
            guestEmail = userData.email;
          }
        } catch {
          // Keep incident creation non-blocking if profile lookup fails.
        }
      }
      await addDoc(collection(firestore, "incidents"), {
        type,
        status: "pending",
        priority: type === "fire" ? "high" : "medium",
        guestId: userId,
        guestEmail,
        location: guestLocation,
        notes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    },
    [firestore, userId]
  );

  const assignIncident = useCallback(async (incidentId: string, staffId: string) => {
    if (!firestore) throw new Error("Firestore unavailable");
    await updateDoc(doc(firestore, "incidents", incidentId), {
      assignedStaffId: staffId,
      status: "acknowledged",
      updatedAt: serverTimestamp()
    });
  }, [firestore]);

  const updateStatus = useCallback(
    async (incidentId: string, status: Incident["status"]) => {
      if (!firestore) throw new Error("Firestore unavailable");
      await updateDoc(doc(firestore, "incidents", incidentId), {
        status,
        updatedAt: serverTimestamp()
      });
    },
    [firestore]
  );

  const persistSummary = useCallback(
    async (incidentId: string, summary: Incident["summary"]) => {
      if (!firestore) throw new Error("Firestore unavailable");
      await updateDoc(doc(firestore, "incidents", incidentId), {
        status: "resolved",
        summary,
        updatedAt: serverTimestamp()
      });
    },
    [firestore]
  );

  const sendChatMessage = useCallback(
    async (incidentId: string, message: string) => {
      if (!userId) throw new Error("Missing user");
      if (!firestore) throw new Error("Firestore unavailable");

      const chatRef = doc(firestore, "chats", incidentId);
      await setDoc(
        chatRef,
        {
          incidentId,
          participants: arrayUnion(userId),
          updatedAt: serverTimestamp(),
          messages: arrayUnion({
            id: crypto.randomUUID(),
            incidentId,
            authorId: userId,
            authorRole: role,
            message,
            createdAt: new Date().toISOString()
          })
        },
        { merge: true }
      );
    },
    [firestore, role, userId]
  );

  const scopedIncidents = useMemo(() => {
    if (role === "guest" && userId) {
      return incidents.filter((incident) => incident.guestId === userId || incident.id.startsWith("mock"));
    }
    if (role === "staff" && userId) {
      return incidents.filter(
        (incident) => incident.assignedStaffId === userId || incident.status !== "resolved"
      );
    }
    return incidents;
  }, [incidents, role, userId]);

  return {
    incidents: scopedIncidents,
    rawIncidents: incidents,
    messages,
    loading,
    createIncident,
    assignIncident,
    updateStatus,
    persistSummary,
    sendChatMessage
  };
}
