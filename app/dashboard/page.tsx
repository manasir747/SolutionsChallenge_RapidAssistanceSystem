"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/styles/dashboard.module.css";
import { useAuth } from "@/context/AuthContext";
import { useIncidents } from "@/hooks/useIncidents";
import EmergencyPanel from "@/components/guest/EmergencyPanel";
import IncidentList from "@/components/shared/IncidentList";
import CommandCenterPanel from "@/components/shared/CommandCenterPanel";
import LiveMap from "@/components/LiveMap";
import AIChatPanel from "@/components/guest/AIChatPanel";
import SuggestionPanel from "@/components/admin/SuggestionPanel";
import ConversationPanel from "@/components/staff/ConversationPanel";
import AnalyticsPanel from "@/components/admin/AnalyticsPanel";
import { ROLE_LABELS, DEFAULT_LOCATION, MOCK_EXITS } from "@/lib/constants";
import { isFirebaseReady } from "@/lib/firebase";
import { Incident, IncidentSource, IncidentType, LocationPoint } from "@/types";

const ROLE_GLYPHS = {
  guest: "🌐",
  staff: "🛰️",
  admin: "🏛️"
} as const;

const INCIDENT_GUIDANCE: Record<IncidentType | "default", string[]> = {
  fire: ["Stay low and cover your mouth with cloth.", "Close doors behind you to slow smoke.", "Use stairs, never elevators."],
  medical: ["Move the injured person away from immediate danger.", "Apply pressure to bleeding wounds.", "Keep the guest warm and conscious."],
  security: ["Stay out of sight and lock nearby doors.", "Do not confront the threat directly.", "Report suspicious descriptions to staff."],
  theft: ["Preserve the scene and avoid confrontation.", "Review camera feeds and access logs.", "Alert security and management immediately."],
  default: ["Stay calm and follow on-screen directions.", "Share accurate details with responders.", "Keep exits and corridors clear."]
};

const STATUS_COPY = {
  safe: {
    label: "Safe",
    message: "No active threats detected. Continue to monitor announcements."
  },
  warning: {
    label: "Warning",
    message: "An incident requires awareness. Prepare to assist or evacuate."
  },
  critical: {
    label: "Critical",
    message: "Prioritize evacuation instructions and assist guests nearby."
  }
} as const;

const EMERGENCY_CONTACT = "112";

const metersBetween = (pointA: LocationPoint, pointB: LocationPoint) => {
  const latDiff = (pointB.lat - pointA.lat) * 111_000;
  const lngDiff =
    (pointB.lng - pointA.lng) * 111_000 * Math.cos(((pointA.lat + pointB.lat) / 2) * (Math.PI / 180));
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, role, loading, logout } = useAuth();
  const { incidents, rawIncidents, messages, createIncident, updateStatus, persistSummary, sendChatMessage } =
    useIncidents(role, user?.uid ?? undefined);

  const [selectedIncident, setSelectedIncident] = useState<Incident | undefined>(undefined);
  const [geoLocation, setGeoLocation] = useState<LocationPoint>(DEFAULT_LOCATION);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const ready = isFirebaseReady;
  const roleGlyph = ROLE_GLYPHS[role];
  const hasGuestMap = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

  const activeIncident = useMemo(() => incidents.find((incident) => incident.status !== "resolved"), [incidents]);
  const broadcastIncident = useMemo(
    () =>
      rawIncidents.find(
        (incident) =>
          incident.status !== "resolved" &&
          incident.source !== "manual" &&
          (incident.guestId === user?.uid || incident.source === "iot" || incident.source === "cctv")
      ),
    [rawIncidents, user?.uid]
  );

  const statusLevel = useMemo(() => {
    if (!activeIncident) return "safe" as const;
    if (activeIncident.priority === "high" || activeIncident.type === "fire") return "critical" as const;
    return "warning" as const;
  }, [activeIncident]);

  const instructionSet = useMemo(() => {
    if (!activeIncident) return INCIDENT_GUIDANCE.default;
    return INCIDENT_GUIDANCE[activeIncident.type] ?? INCIDENT_GUIDANCE.default;
  }, [activeIncident]);

  const nearestExit = useMemo(() => {
    if (!geoLocation) return null;
    let closest = MOCK_EXITS[0];
    let minDistance = Number.POSITIVE_INFINITY;
    MOCK_EXITS.forEach((exit) => {
      const distance = metersBetween(geoLocation, exit);
      if (distance < minDistance) {
        minDistance = distance;
        closest = exit;
      }
    });
    const direction = closest.lng - geoLocation.lng >= 0 ? "right" : "left";
    return {
      label: closest.label,
      distance: Math.max(5, Math.round(minDistance)),
      direction
    };
  }, [geoLocation]);

  const timelineEvents = useMemo(() => {
    const formatTime = (value?: string) => {
      if (!value) return "Just now";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "Just now";
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    return incidents.slice(0, 4).map((incident) => ({
      id: incident.id,
      label: `${incident.type.charAt(0).toUpperCase()}${incident.type.slice(1)} alert • ${incident.source}`,
      status: incident.status,
      time: formatTime(incident.updatedAt ?? incident.createdAt),
      notes: incident.notes ?? "Awaiting field report"
    }));
  }, [incidents]);

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

  const handleTrigger = async (type: IncidentType, source: IncidentSource, notes?: string) => {
    try {
      await createIncident(type, source, geoLocation, notes);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to trigger incident");
    }
  };

  const handleResolve = async (incident: Incident) => {
    try {
      if (incident.status === "resolved") {
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

  const staffNearestExit = useMemo(() => {
    if (!selectedIncident) return null;
    let closest = MOCK_EXITS[0];
    let minDistance = Number.POSITIVE_INFINITY;
    MOCK_EXITS.forEach((exit) => {
      const distance = metersBetween(selectedIncident.location, exit);
      if (distance < minDistance) {
        minDistance = distance;
        closest = exit;
      }
    });

    return {
      label: closest.label ?? "Nearest exit",
      distance: Math.max(5, Math.round(minDistance))
    };
  }, [selectedIncident]);

  const systemStatusLabel = ready ? "Live" : "Simulation";
  const activeIncidentLabel = activeIncident
    ? `${activeIncident.type} • ${activeIncident.source} • ${activeIncident.status.replace(/_/g, " ")}`
    : "No active incident";

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
          <div className={styles.titleMeta}>
            <p>{ROLE_LABELS[role]} View</p>
            <span className={styles.rolePill}>{role.toUpperCase()}</span>
          </div>
        </div>
        <div className={styles.headerMeta}>
          <div className={styles.metaTile}>
            <p>Emergency desk</p>
            <div className={styles.metaPrimary}>{EMERGENCY_CONTACT}</div>
          </div>
          <div className={styles.metaTile}>
            <p>System status</p>
            <div className={`${styles.metaStatus} ${ready ? styles.statusLive : styles.statusSim}`}>{systemStatusLabel}</div>
          </div>
          <div className={styles.metaTile}>
            <p>Active incident</p>
            <div className={styles.metaPrimary}>{activeIncidentLabel}</div>
          </div>
          <div className={styles.userBadge}>
            <span className={styles.userBadgeIcon} aria-hidden="true">
              {roleGlyph}
            </span>
            <div>
              <p>Logged in</p>
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
            <div className={styles.full}>
              <EmergencyPanel onTrigger={handleTrigger} currentLocation={geoLocation} />
            </div>
            {broadcastIncident && (
              <div className={styles.full}>
                <div className={`${styles.card} ${styles.guestAlertCard}`}>
                  <div className={styles.cardHeader}>
                    <div>
                      <p className={styles.cardEyebrow}>Alert detected</p>
                      <h3>
                        {broadcastIncident.type.toUpperCase()} detected via {broadcastIncident.source.toUpperCase()}
                      </h3>
                    </div>
                    <span className={styles.statusChip}>Live alert</span>
                  </div>
                  <p className={styles.safetyMessage}>{broadcastIncident.notes ?? "Follow on-screen instructions immediately."}</p>
                  <div className={styles.alertMetaGrid}>
                    <div>
                      <span>Responder</span>
                      <strong>{broadcastIncident.assignedStaffName ?? "Assigned responder"}</strong>
                    </div>
                    <div>
                      <span>Department</span>
                      <strong>{broadcastIncident.assignedStaffDepartment ?? "Emergency Response"}</strong>
                    </div>
                    <div>
                      <span>Distance</span>
                      <strong>{broadcastIncident.responderDistanceMeters ?? 0}m away</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className={styles.half}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.cardEyebrow}>Field View</p>
                    <h3>Live incident map</h3>
                  </div>
                  <span className={styles.signalBadge}>Tracking</span>
                </div>
                <LiveMap incidents={incidents} guestLocation={geoLocation} focusIncident={selectedIncident} />
              </div>
            </div>
            <div className={styles.half}>
              <div className={`${styles.card} ${styles.safetyPanel}`}>
                 <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.cardEyebrow}>Guidance</p>
                    <h3>Safety actions</h3>
                  </div>
                  <span className={`${styles.statusChip} ${styles[`status${statusLevel.charAt(0).toUpperCase() + statusLevel.slice(1)}`]}`}>
                    {STATUS_COPY[statusLevel].label}
                  </span>
                </div>
                <p className={styles.safetyMessage}>{STATUS_COPY[statusLevel].message}</p>
                <div className={styles.exitCallout}>
                  <div>
                    <p>Nearest exit</p>
                    <strong>
                      {nearestExit
                        ? `${nearestExit.label} • ${nearestExit.distance}m to your ${nearestExit.direction}`
                        : "Exits highlighted on map"}
                    </strong>
                  </div>
                  <button className={styles.secondaryButton} type="button" onClick={() => setSelectedIncident(incidents[0])}>
                    Focus map
                  </button>
                </div>
                <ul className={styles.instructionList}>
                  {instructionSet.map((tip) => (
                    <li key={tip}>
                      <span aria-hidden="true">●</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className={styles.full}>
              <div className={styles.guestLowerGrid}>
                <AIChatPanel role={role} />
                <div className={`${styles.card} ${styles.timelinePane}`}>
                  <div className={styles.cardHeader}>
                    <div>
                      <p className={styles.cardEyebrow}>Activity</p>
                      <h3>Incident timeline</h3>
                    </div>
                    <span className={styles.signalBadge}>Live feed</span>
                  </div>
                  <ul className={styles.timelineList}>
                    {timelineEvents.length ? (
                      timelineEvents.map((event) => (
                        <li key={event.id} className={styles.timelineItem}>
                          <div className={styles.timelineBadge} />
                          <div>
                            <div className={styles.timelineMeta}>
                              <strong>{event.label}</strong>
                              <span>{event.time}</span>
                            </div>
                            <p>{event.notes}</p>
                            <small>Status: {event.status.replace(/_/g, " ")}</small>
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className={styles.timelineEmpty}>No active incidents yet. Stay alert for instructions.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {role === "staff" && (
          <>
            <div className={styles.full}>
              <IncidentList
                incidents={incidents}
                role={role}
                onResolve={handleResolve}
                onSelect={setSelectedIncident}
                selectedId={selectedIncident?.id}
              />
            </div>
            <div className={styles.full}>
              <div className={styles.staffWorkspace}>
                <div className={`${styles.card} ${styles.staffMapCard}`}>
                  <div className={styles.cardHeader}>
                    <div>
                      <p className={styles.cardEyebrow}>Field view</p>
                      <h3>Live incident map</h3>
                    </div>
                    <span className={styles.signalBadge}>Tracking</span>
                  </div>
                  <LiveMap incidents={incidents} focusIncident={selectedIncident} />
                </div>
                <ConversationPanel
                  incident={selectedIncident}
                  messages={chatMessages}
                  nearestExit={staffNearestExit}
                  onSend={handleSendChat}
                />
              </div>
            </div>
          </>
        )}

        {role === "admin" && (
          <>
            <div className={styles.full}>
              <CommandCenterPanel incidents={rawIncidents} activeIncident={selectedIncident ?? activeIncident} />
            </div>
            <div className={styles.full}>
              <IncidentList
                incidents={rawIncidents}
                role={role}
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
