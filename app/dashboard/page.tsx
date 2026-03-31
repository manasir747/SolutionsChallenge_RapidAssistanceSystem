"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/styles/dashboard.module.css";
import { useAuth } from "@/context/AuthContext";
import { useIncidents } from "@/hooks/useIncidents";
import EmergencyPanel from "@/components/EmergencyPanel";
import IncidentList from "@/components/IncidentList";
import LiveMap from "@/components/LiveMap";
import AIChatPanel from "@/components/AIChatPanel";
import SuggestionPanel from "@/components/SuggestionPanel";
import ConversationPanel from "@/components/ConversationPanel";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import { ROLE_LABELS, DEFAULT_LOCATION } from "@/lib/constants";
import { isFirebaseReady } from "@/lib/firebase";
import { Incident, LocationPoint } from "@/types";

const ROLE_GLYPHS = {
  guest: "🌐",
  staff: "🛰️",
  admin: "🏛️"
} as const;

export default function DashboardPage() {
  const router = useRouter();
  const { user, role, loading, logout } = useAuth();
  const { incidents, rawIncidents, messages, createIncident, assignIncident, updateStatus, persistSummary, sendChatMessage } =
    useIncidents(role, user?.uid ?? undefined);

  const [selectedIncident, setSelectedIncident] = useState<Incident | undefined>(undefined);
  const [geoLocation, setGeoLocation] = useState<LocationPoint>(DEFAULT_LOCATION);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const ready = isFirebaseReady;
  const roleGlyph = ROLE_GLYPHS[role];

  const guestSignals = useMemo(
    () => [
      { label: "Response ETA", value: "< 4 min", hint: "Nearest safety team en route" },
      { label: "Shelter Level", value: "Stable", hint: "No evacuation order" },
      { label: "Signal", value: "Strong", hint: "Emergency channel connected" }
    ],
    []
  );

  const guestTips = useMemo(
    () => [
      "Keep exits clear of luggage or carts.",
      "Share accurate details with responders when prompted.",
      "Avoid elevators until the all-clear message is sent."
    ],
    []
  );

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!selectedIncident && incidents.length) {
      setSelectedIncident(incidents[0]);
    }
  }, [incidents, selectedIncident]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: "My location"
        });
      },
      () => {
        setGeoLocation(DEFAULT_LOCATION);
      }
    );
  }, []);

  const handleTrigger = async (type: Incident["type"], notes?: string) => {
    try {
      await createIncident(type, geoLocation, notes);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to trigger incident");
    }
  };

  const handleAssign = async (incident: Incident) => {
    if (!user?.uid) return;
    try {
      await assignIncident(incident.id, user.uid);
      setSelectedIncident(incident);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Assignment failed");
    }
  };

  const handleResolve = async (incident: Incident) => {
    try {
      if (incident.status === "resolved") {
        await updateStatus(incident.id, "pending");
        return;
      }

      const summaryResponse = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident })
      });
      const summary = await summaryResponse.json();
      await persistSummary(incident.id, summary.summary);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Summary failed");
    }
  };

  const handleSendChat = async (text: string) => {
    if (!selectedIncident) return;
    try {
      await sendChatMessage(selectedIncident.id, text);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Message failed");
    }
  };

  const chatMessages = useMemo(() => {
    if (!selectedIncident) return [];
    return messages[selectedIncident.id] ?? [];
  }, [messages, selectedIncident]);

  if (loading) {
    return (
      <main className={styles.shell}>
        <p>Loading secure dashboard...</p>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <div className={styles.topBar}>
        <div>
          <h1>Rapid Assistance</h1>
          <p>{ROLE_LABELS[role]} View</p>
        </div>
        <div className={styles.userCluster}>
          <div className={styles.userBadge}>
            <span className={styles.userBadgeIcon} aria-hidden="true">
              {roleGlyph}
            </span>
            <div>
              <p>Secure session</p>
              <strong>{ROLE_LABELS[role]}</strong>
            </div>
          </div>
          {user && (
            <button className={styles.logoutButton} onClick={logout} aria-label="Logout">
              <span>Logout</span>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M5 10h10m0 0-3-3m3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {!ready && (
        <div className={styles.card}>
          <strong>Demo mode</strong>
          <p>Firebase credentials missing. Live data is mocked until environment variables are set.</p>
        </div>
      )}

      {errorMessage && (
        <div className={styles.card}>
          <p>{errorMessage}</p>
        </div>
      )}

      <section className={styles.grid}>
        {role === "guest" && (
          <>
            <div className={styles.half}>
              <EmergencyPanel onTrigger={handleTrigger} currentLocation={geoLocation} />
            </div>
            <div className={styles.half}>
              <div className={`${styles.card} ${styles.signalPanel}`}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.cardEyebrow}>Readiness</p>
                    <h3>Safety Snapshot</h3>
                  </div>
                  <span className={styles.signalBadge}>Calm</span>
                </div>
                <div className={styles.signalGrid}>
                  {guestSignals.map((signal) => (
                    <div key={signal.label} className={styles.signalTile}>
                      <span>{signal.label}</span>
                      <strong>{signal.value}</strong>
                      <small>{signal.hint}</small>
                    </div>
                  ))}
                </div>
                <ul className={styles.tipList}>
                  {guestTips.map((tip) => (
                    <li key={tip} className={styles.tipItem}>
                      <span aria-hidden="true">✦</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className={styles.full}>
              <LiveMap incidents={incidents} guestLocation={geoLocation} focusIncident={selectedIncident} />
            </div>
            <div className={styles.full}>
              <AIChatPanel role={role} />
            </div>
          </>
        )}

        {role === "staff" && (
          <>
            <div className={styles.full}>
              <IncidentList
                incidents={incidents}
                role={role}
                onAssign={handleAssign}
                onResolve={handleResolve}
                onSelect={setSelectedIncident}
                selectedId={selectedIncident?.id}
              />
            </div>
            <div className={styles.half}>
              <LiveMap incidents={incidents} focusIncident={selectedIncident} />
            </div>
            <div className={styles.half}>
              <ConversationPanel
                incident={selectedIncident}
                messages={chatMessages}
                onSend={handleSendChat}
              />
            </div>
          </>
        )}

        {role === "admin" && (
          <>
            <div className={styles.full}>
              <IncidentList
                incidents={rawIncidents}
                role={role}
                onAssign={handleAssign}
                onResolve={handleResolve}
                onSelect={setSelectedIncident}
                selectedId={selectedIncident?.id}
              />
            </div>
            <div className={styles.half}>
              <AnalyticsPanel incidents={rawIncidents} />
            </div>
            <div className={styles.half}>
              <SuggestionPanel />
            </div>
            <div className={styles.full}>
              <LiveMap incidents={rawIncidents} focusIncident={selectedIncident} />
            </div>
          </>
        )}
      </section>
    </main>
  );
}
