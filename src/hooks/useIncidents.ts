"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { DEFAULT_LOCATION } from "@/lib/constants";
import { ChatMessage, Incident, IncidentSource, IncidentType, UserRole } from "@/types";

type StaffProfile = {
  id: string;
  email?: string;
  displayName?: string;
  department?: string;
};

const DEPARTMENT_MATCH: Record<IncidentType, string[]> = {
  fire: ["fire", "safety", "fireman"],
  medical: ["medical", "emt", "nurse", "doctor"],
  security: ["security", "police", "guard"],
  theft: ["police", "security", "investigation"]
};

const NOTIFIED_DEPARTMENTS: Record<IncidentType, string[]> = {
  fire: ["Fire Department", "Emergency Medical Services"],
  medical: ["Emergency Medical Services", "Hospital Liaison"],
  security: ["Hotel Security Department", "Police Department"],
  theft: ["Police Department", "Hotel Security Department"]
};

const normalizeDepartment = (value?: string) => (value ?? "general").trim().toLowerCase();

const fallbackIncidents: Incident[] = [
  {
    id: "mock-1",
    type: "fire",
    source: "manual",
    status: "pending",
    priority: "high",
    severity: "critical",
    guestId: "guest-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    location: { lat: 12.972, lng: 77.595, label: "MG Road Plaza" },
    notes: "Alarm triggered on level 4",
    affectedPeople: 24,
    assignedTeam: ["Security", "Manager"],
    guestRoomNumber: "402",
    assignedStaffName: "Officer Rao",
    assignedStaffEmail: "officer.rao@rapidassist.local",
    assignedStaffDepartment: "Fire Response",
    notifiedDepartments: ["Fire Department", "Emergency Medical Services"],
    responderDistanceMeters: 140
  },
  {
    id: "mock-2",
    type: "medical",
    source: "manual",
    status: "acknowledged",
    priority: "medium",
    severity: "medium",
    guestId: "guest-2",
    assignedStaffId: "staff-5",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    location: { lat: 12.97, lng: 77.59, label: "Lalbagh Wing" },
    notes: "Guest reported breathing difficulty",
    affectedPeople: 1,
    assignedTeam: ["Staff", "Manager"],
    guestRoomNumber: "217",
    assignedStaffName: "Nurse Priya",
    assignedStaffEmail: "priya.med@rapidassist.local",
    assignedStaffDepartment: "Medical Response",
    notifiedDepartments: ["Emergency Medical Services", "Hospital Liaison"],
    responderDistanceMeters: 90
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
          const source = data.source ?? "manual";
          const severity = data.severity ?? data.priority ?? "medium";
          return {
            ...data,
            id: docSnap.id,
            source,
            severity,
            priority: severity,
            timestamp: toIsoString(data.timestamp ?? data.createdAt),
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
    async (
      type: IncidentType,
      source: IncidentSource,
      guestLocation: Incident["location"] = DEFAULT_LOCATION,
      notes?: string
    ) => {
      if (!userId) throw new Error("Authentication required");
      if (!firestore) throw new Error("Firestore unavailable");
      let guestEmail = auth?.currentUser?.email ?? undefined;
      let guestRoomNumber = "Room pending";
      if (!guestEmail) {
        try {
          const userSnap = await getDoc(doc(firestore, "users", userId));
          if (userSnap.exists()) {
            const userData = userSnap.data() as { email?: string; roomNumber?: string; room?: string; roomNo?: string };
            guestEmail = userData.email;
            guestRoomNumber = userData.roomNumber ?? userData.room ?? userData.roomNo ?? guestRoomNumber;
          }
        } catch {
          // Keep incident creation non-blocking if profile lookup fails.
        }
      } else {
        try {
          const userSnap = await getDoc(doc(firestore, "users", userId));
          if (userSnap.exists()) {
            const userData = userSnap.data() as { roomNumber?: string; room?: string; roomNo?: string };
            guestRoomNumber = userData.roomNumber ?? userData.room ?? userData.roomNo ?? guestRoomNumber;
          }
        } catch {
          // Room enrichment is best-effort.
        }
      }
      const severityByType: Record<IncidentType, Incident["severity"]> = {
        fire: "critical",
        medical: "medium",
        security: "high",
        theft: "high"
      };

      const staffQuery = query(collection(firestore, "users"), where("role", "==", "staff"));
      let selectedStaff: StaffProfile | undefined;
      try {
        const staffSnapshot = await getDocs(staffQuery);
        const candidates: StaffProfile[] = staffSnapshot.docs.map((staffDoc) => {
          const data = staffDoc.data() as {
            email?: string;
            displayName?: string;
            department?: string;
            staffType?: string;
            team?: string;
          };
          return {
            id: staffDoc.id,
            email: data.email,
            displayName: data.displayName,
            department: data.department ?? data.staffType ?? data.team ?? "General Response"
          };
        });

        const preferredKeywords = DEPARTMENT_MATCH[type];
        const scored = candidates
          .map((candidate) => {
            const normalized = normalizeDepartment(candidate.department);
            const departmentScore = preferredKeywords.some((keyword) => normalized.includes(keyword)) ? 3 : 0;
            const severityScore = severityByType[type] === "critical" ? 2 : severityByType[type] === "high" ? 1 : 0;
            return {
              candidate,
              score: departmentScore + severityScore
            };
          })
          .sort((left, right) => right.score - left.score);

        selectedStaff = scored[0]?.candidate;
      } catch {
        // Keep incident creation resilient even if staff lookup fails.
      }

      const assignedTeam =
        type === "medical"
          ? ["Staff", "Manager"]
          : type === "fire"
            ? ["Security", "Manager", "Staff"]
            : ["Security", "Manager"];

      const responderDistanceMeters =
        severityByType[type] === "critical"
          ? 80 + Math.floor(Math.random() * 120)
          : severityByType[type] === "high"
            ? 140 + Math.floor(Math.random() * 180)
            : 220 + Math.floor(Math.random() * 220);

      await addDoc(collection(firestore, "incidents"), {
        type,
        source,
        status: selectedStaff ? "acknowledged" : "pending",
        priority: severityByType[type],
        severity: severityByType[type],
        guestId: userId,
        guestEmail,
        guestRoomNumber,
        location: guestLocation,
        notes,
        affectedPeople: type === "medical" ? 1 : type === "fire" ? 18 : type === "theft" ? 3 : 6,
        assignedStaffId: selectedStaff?.id,
        assignedStaffName: selectedStaff?.displayName ?? "Auto-assigned responder",
        assignedStaffEmail: selectedStaff?.email,
        assignedStaffDepartment: selectedStaff?.department ?? "General Response",
        assignedTeam,
        notifiedDepartments: NOTIFIED_DEPARTMENTS[type],
        responderDistanceMeters,
        timestamp: serverTimestamp(),
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
      return incidents.filter(
        (incident) =>
          incident.guestId === userId ||
          incident.id.startsWith("mock") ||
          (incident.source !== "manual" && incident.status !== "resolved")
      );
    }
    if (role === "staff" && userId) {
      return incidents.filter((incident) => incident.assignedStaffId === userId);
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
