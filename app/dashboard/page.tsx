"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import styles from "@/styles/dashboard.module.css";
import { useAuth } from "@/context/AuthContext";
import { useIncidents } from "@/hooks/useIncidents";
import EmergencyPanel from "@/components/guest/EmergencyPanel";
import GuestDashboard from "@/components/guest/GuestDashboard";
import IncidentList from "@/components/shared/IncidentList";
import CommandCenterPanel from "@/components/shared/CommandCenterPanel";
import LiveMap from "@/components/LiveMap";
import AIChatPanel from "@/components/guest/AIChatPanel";
import SuggestionPanel from "@/components/admin/SuggestionPanel";
import ConversationPanel from "@/components/staff/ConversationPanel";
import AnalyticsPanel from "@/components/admin/AnalyticsPanel";
import { ROLE_LABELS, DEFAULT_LOCATION, MOCK_EXITS } from "@/lib/constants";
import { db, isFirebaseReady } from "@/lib/firebase";
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

const ADMIN_NOTIFY_DEPARTMENTS = [
  "Police Department",
  "Fire Department",
  "Emergency Medical Services",
  "Hospital Liaison",
  "Hotel Security Department",
  "Local Authority Command"
] as const;

const ADMIN_IOT_SIMULATIONS: Array<{ type: IncidentType; source: IncidentSource; label: string; hint: string }> = [
  { type: "fire", source: "iot", label: "Sensor Fire", hint: "Heat / smoke spike from IoT sensor" },
  { type: "medical", source: "iot", label: "Sensor Medical", hint: "Wearable emergency trigger" },
  { type: "security", source: "iot", label: "Sensor Security", hint: "Unauthorized access sensor event" },
  { type: "theft", source: "iot", label: "Sensor Theft", hint: "Asset tracking anomaly" }
];

type StaffOption = {
  id: string;
  email: string;
  displayName?: string;
  department?: string;
};

const metersBetween = (pointA: LocationPoint, pointB: LocationPoint) => {
  const latDiff = (pointB.lat - pointA.lat) * 111_000;
  const lngDiff =
    (pointB.lng - pointA.lng) * 111_000 * Math.cos(((pointA.lat + pointB.lat) / 2) * (Math.PI / 180));
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
};

const projectPointByMeters = (origin: LocationPoint, distanceMeters: number, bearingDegrees: number): LocationPoint => {
  const latStep = (distanceMeters * Math.cos((bearingDegrees * Math.PI) / 180)) / 111_000;
  const lngStep =
    (distanceMeters * Math.sin((bearingDegrees * Math.PI) / 180)) /
    (111_000 * Math.cos((origin.lat * Math.PI) / 180));

  return {
    lat: origin.lat + latStep,
    lng: origin.lng + lngStep,
    label: "Responder route"
  };
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, role, loading, logout } = useAuth();
  const { incidents, rawIncidents, messages, createIncident, assignIncident, notifyDepartment, updateStatus, persistSummary, sendChatMessage } =
    useIncidents(role, user?.uid ?? undefined);

  const [selectedIncident, setSelectedIncident] = useState<Incident | undefined>(undefined);
  const [adminIncidentView, setAdminIncidentView] = useState<"active" | "closed">("active");
  const [geoLocation, setGeoLocation] = useState<LocationPoint>(DEFAULT_LOCATION);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadingIncidentId, setDownloadingIncidentId] = useState<string | null>(null);
  const [availableStaff, setAvailableStaff] = useState<StaffOption[]>([]);
  const [simulatingIncidentType, setSimulatingIncidentType] = useState<IncidentType | null>(null);
  
  // Simulation Command Center States
  const [simulationMode, setSimulationMode] = useState<"live" | "sim">("sim");
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [simSeverity, setSimSeverity] = useState<"low" | "medium" | "critical">("medium");
  const [simLocation, setSimLocation] = useState("Floor 4, Wing B");
  const [simSensitivity, setSimSensitivity] = useState(75);
  const [simTimeline, setSimTimeline] = useState<{ time: string; event: string; status: string }[]>([]);
  const [isSimRunning, setIsSimRunning] = useState(false);
  const ready = isFirebaseReady;
  const roleGlyph = ROLE_GLYPHS[role];
  const hasGuestMap = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

  const activeIncidents = useMemo(() => incidents.filter((incident) => incident.status !== "resolved"), [incidents]);
  const closedIncidents = useMemo(() => incidents.filter((incident) => incident.status === "resolved"), [incidents]);
  const activeIncident = useMemo(() => activeIncidents[0], [activeIncidents]);
  const guestActiveIncident = useMemo(() => {
    if (!user?.uid) return undefined;
    return activeIncidents.find((incident) => incident.guestId === user.uid);
  }, [activeIncidents, user?.uid]);
  const visibleIncidents = useMemo(() => {
    if (role !== "admin") return activeIncidents;
    return adminIncidentView === "closed" ? closedIncidents : activeIncidents;
  }, [activeIncidents, adminIncidentView, closedIncidents, role]);
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

  const guestTrackedIncident = useMemo(
    () => guestActiveIncident ?? broadcastIncident,
    [guestActiveIncident, broadcastIncident]
  );

  const guestStatusIncident = guestTrackedIncident ?? activeIncident;

  const statusLevel = useMemo(() => {
    if (!guestStatusIncident) return "safe" as const;
    if (guestStatusIncident.priority === "high" || guestStatusIncident.type === "fire") return "critical" as const;
    return "warning" as const;
  }, [guestStatusIncident]);

  const instructionSet = useMemo(() => {
    if (!guestStatusIncident) return INCIDENT_GUIDANCE.default;
    return INCIDENT_GUIDANCE[guestStatusIncident.type] ?? INCIDENT_GUIDANCE.default;
  }, [guestStatusIncident]);

  const responderLocation = useMemo(() => {
    if (!guestTrackedIncident) return undefined;
    const distance = guestTrackedIncident.responderDistanceMeters ?? 180;
    const referencePoint = guestTrackedIncident.location ?? geoLocation;
    return projectPointByMeters(referencePoint, Math.max(40, distance), 32);
  }, [geoLocation, guestTrackedIncident]);

  const responderDistance = useMemo(() => {
    if (!responderLocation) return undefined;
    return Math.round(metersBetween(geoLocation, responderLocation));
  }, [geoLocation, responderLocation]);

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
    if (!visibleIncidents.length) {
      if (selectedIncident) {
        setSelectedIncident(undefined);
      }
      return;
    }

    const stillActiveSelection =
      selectedIncident && visibleIncidents.some((incident) => incident.id === selectedIncident.id)
        ? selectedIncident
        : visibleIncidents[0];

    if (!selectedIncident || selectedIncident.id !== stillActiveSelection.id) {
      setSelectedIncident(stillActiveSelection);
    }
  }, [selectedIncident, visibleIncidents]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGeoLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: "My location"
        });
      },
      (error) => {
        console.warn("Geolocation error:", error.code, error.message);
        const msg = error.code === 1 
          ? "Location access denied. Please enable GPS for tactical guidance." 
          : "Satellite signal weak. Using estimated hotel coordinates.";
        setErrorMessage(msg);
        setGeoLocation(prev => prev || DEFAULT_LOCATION);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (role !== "admin" || !db) {
      setAvailableStaff([]);
      return;
    }

    const staffQuery = query(collection(db, "users"), where("role", "==", "staff"));
    const unsubscribe = onSnapshot(staffQuery, (snapshot) => {
      const nextStaff = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() as {
            email?: string;
            displayName?: string;
            department?: string;
            staffType?: string;
            team?: string;
          };
          return {
            id: docSnap.id,
            email: data.email ?? "",
            displayName: data.displayName,
            department: data.department ?? data.staffType ?? data.team ?? "General Response"
          };
        })
        .filter((staff) => staff.email)
        .sort((left, right) => left.email.localeCompare(right.email));

      setAvailableStaff(nextStaff);
    });

    return () => unsubscribe();
  }, [role]);

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
      try {
        await updateStatus(incident.id, "resolved");
      } catch (fallbackErr) {
        setErrorMessage(fallbackErr instanceof Error ? fallbackErr.message : "Summary failed");
        return;
      }
      setErrorMessage("Summary unavailable. Incident marked resolved.");
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

  const handleDownloadSummary = async (incident: Incident) => {
    setDownloadingIncidentId(incident.id);
    try {
      const response = await fetch("/api/ai/summary/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        window.alert(payload.error ?? "Unable to generate summary PDF.");
        return;
      }

      const pdfBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `incident-summary-${incident.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to generate summary PDF.");
    } finally {
      setDownloadingIncidentId(null);
    }
  };

  const handleReassignIncident = async (incident: Incident, staffId: string) => {
    const selectedStaff = availableStaff.find((staff) => staff.id === staffId);
    if (!selectedStaff) {
      setErrorMessage("Selected staff member is unavailable.");
      return;
    }

    try {
      await assignIncident(incident.id, {
        id: selectedStaff.id,
        email: selectedStaff.email,
        displayName: selectedStaff.displayName,
        department: selectedStaff.department
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to reassign incident");
    }
  };

  const handleNotifyDepartment = async (incident: Incident, department: string) => {
    try {
      await notifyDepartment(incident.id, department);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to notify department");
    }
  };

  const handleSimulateIotIncident = async (type: IncidentType, source: IncidentSource, hint: string) => {
    setSimulatingIncidentType(type);
    setIsSimRunning(true);
    setSimTimeline([
      { time: "t+0s", event: "Sensor network triggered", status: "active" },
      { time: "t+2s", event: "AI analysis in progress", status: "pending" }
    ]);

    try {
      await createIncident(type, source, DEFAULT_LOCATION, `[SIMULATION] ${source.toUpperCase()} emergency: ${hint} (Severity: ${simSeverity})`);
      
      setTimeout(() => {
        setSimTimeline(prev => [
          ...prev.map(t => ({ ...t, status: "completed" })),
          { time: "t+5s", event: "Alerts broadcasted to guests", status: "completed" },
          { time: "t+15s", event: "Responder dispatch initiated", status: "active" }
        ]);
      }, 2000);

    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to simulate IoT emergency");
      setIsSimRunning(false);
    } finally {
      setSimulatingIncidentType(null);
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
    <main className={`${styles.shell} ${role === "admin" ? styles.adminShell : ""}`}>
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
          <div className={styles.metaTile}>
            <p>GPS Telemetry</p>
            <div className={`${styles.metaStatus} ${geoLocation.lat !== DEFAULT_LOCATION.lat ? styles.statusLive : styles.statusWarning}`}>
              {geoLocation.lat !== DEFAULT_LOCATION.lat ? "Satellite Lock" : "Standard Grid"}
            </div>
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
          <div className={styles.full}>
            <GuestDashboard 
              user={user}
              activeIncident={guestTrackedIncident}
              geoLocation={geoLocation}
              nearestExit={nearestExit}
              responderDistance={responderDistance}
              onTrigger={handleTrigger}
              onResolve={handleResolve}
              incidents={incidents}
              timelineEvents={timelineEvents}
              isSimulation={simulationMode === 'sim'}
            />
          </div>
        )}

        {role === "staff" && (
          <>
            <div className={styles.full}>
              <IncidentList
                incidents={activeIncidents}
                role={role}
                onResolve={handleResolve}
                onSelect={setSelectedIncident}
                selectedId={selectedIncident?.id}
                onDownloadSummary={handleDownloadSummary}
                downloadingSummaryId={downloadingIncidentId}
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
          <div className={styles.adminContainer}>
            <div className={styles.adminGrid}>
              <div className={styles.adminPrimary}>
                <CommandCenterPanel incidents={activeIncidents} activeIncident={activeIncident} />
                <div className={`${styles.card} ${styles.simulationCommandCenter} ${simulationMode === 'sim' ? styles.modeSimActive : ''}`}>
                  <div className={styles.cardHeader}>
                    <div className={styles.ccHeaderMain}>
                      <div className={styles.ccTitleGroup}>
                        <p className={styles.cardEyebrow}>Primary Control Node</p>
                        <h3>Simulation Command Center</h3>
                        <p className={styles.ccSubtext}>Run intelligent emergency drills using IoT signals</p>
                      </div>
                      <div className={styles.ccHeaderControls}>
                        <div className={styles.modeToggle}>
                          <button 
                            className={simulationMode === 'live' ? styles.activeMode : ''} 
                            onClick={() => setSimulationMode('live')}
                          >Live</button>
                          <button 
                            className={simulationMode === 'sim' ? styles.activeMode : ''} 
                            onClick={() => setSimulationMode('sim')}
                          >Simulation</button>
                        </div>
                        <div className={styles.ccStats}>
                          <div className={styles.ccStatPill}><span>Sims Today</span> <strong>12</strong></div>
                          <div className={styles.ccStatPill}><span>Avg Resp</span> <strong>4.2m</strong></div>
                          <div className={styles.ccStatPill} style={{ color: '#5de0e6' }}><span>AI Readiness</span> <strong>98%</strong></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.adminSimulationGrid}>
                    {ADMIN_IOT_SIMULATIONS.map((simulation) => {
                      const isSelected = selectedScenario === simulation.type;
                      return (
                        <div 
                          key={`${simulation.source}-${simulation.type}`}
                          className={`${styles.scenarioCard} ${isSelected ? styles.scenarioExpanded : ''} ${styles[`scenario${simulation.type.charAt(0).toUpperCase() + simulation.type.slice(1)}`]}`}
                          onClick={() => setSelectedScenario(isSelected ? null : simulation.type)}
                        >
                          <div className={styles.scenarioCardHeader}>
                            <div className={styles.scenarioIcon}>
                              {simulation.type === 'fire' && '🔥'}
                              {simulation.type === 'medical' && '🏥'}
                              {simulation.type === 'security' && '🛡️'}
                              {simulation.type === 'theft' && '🎒'}
                            </div>
                            <div className={styles.scenarioInfo}>
                              <strong>{simulation.label}</strong>
                              <span>{simulation.hint}</span>
                            </div>
                          </div>

                          {isSelected && (
                            <div className={styles.scenarioControls} onClick={(e) => e.stopPropagation()}>
                              <div className={styles.controlGroup}>
                                <label>Severity Level</label>
                                <div className={styles.severitySwitch}>
                                  {['low', 'medium', 'critical'].map(s => (
                                    <button 
                                      key={s}
                                      className={simSeverity === s ? styles[`active${s.charAt(0).toUpperCase() + s.slice(1)}`] : ''}
                                      onClick={() => setSimSeverity(s as any)}
                                    >{s}</button>
                                  ))}
                                </div>
                              </div>

                              <div className={styles.controlGroup}>
                                <label>Target Location</label>
                                <select value={simLocation} onChange={(e) => setSimLocation(e.target.value)} className={styles.ccSelect}>
                                  <option>Floor 4, Wing B</option>
                                  <option>Main Lobby</option>
                                  <option>Conference Hall C</option>
                                  <option>Staff Quarters</option>
                                </select>
                              </div>

                              <div className={styles.controlGroup}>
                                <label>Sensor Sensitivity ({simSensitivity}%)</label>
                                <input 
                                  type="range" 
                                  min="0" max="100" 
                                  value={simSensitivity} 
                                  onChange={(e) => setSimSensitivity(parseInt(e.target.value))}
                                  className={styles.ccSlider}
                                />
                              </div>

                              <div className={styles.scenarioActions}>
                                <button 
                                  className={styles.primaryAction}
                                  onClick={() => handleSimulateIotIncident(simulation.type, simulation.source, simulation.hint)}
                                  disabled={isSimRunning}
                                >
                                  {isSimRunning ? 'Simulation Running...' : 'Simulate Now'}
                                </button>
                                <button className={styles.secondaryAction}>Preview AI Impact</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isSimRunning && (
                    <div className={styles.simulationTimeline}>
                      <div className={styles.timelineHeader}>
                        <h4>Simulation Active: {selectedScenario?.toUpperCase()}</h4>
                        <button onClick={() => setIsSimRunning(false)} className={styles.closeSim}>Terminate</button>
                      </div>
                      <div className={styles.timelineStrip}>
                        {simTimeline.map((t, idx) => (
                          <div key={idx} className={`${styles.timelineStep} ${styles[`step${t.status.charAt(0).toUpperCase() + t.status.slice(1)}`]}`}>
                            <span className={styles.stepTime}>{t.time}</span>
                            <span className={styles.stepEvent}>{t.event}</span>
                            <div className={styles.stepDot}></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2>{adminIncidentView === "closed" ? "Closed incidents" : "Active incidents"}</h2>
                    <p>
                      {adminIncidentView === "closed"
                        ? "Resolved incidents available for review and export."
                        : "Urgent issues requiring immediate attention."}
                    </p>
                  </div>
                  <div className={styles.viewToggle}>
                    <button
                      className={adminIncidentView === "active" ? styles.primaryButton : styles.secondaryButton}
                      type="button"
                      onClick={() => setAdminIncidentView("active")}
                    >
                      Active
                    </button>
                    <button
                      className={adminIncidentView === "closed" ? styles.primaryButton : styles.secondaryButton}
                      type="button"
                      onClick={() => setAdminIncidentView("closed")}
                    >
                      Closed
                    </button>
                  </div>
                </div>
                <IncidentList
                  incidents={visibleIncidents}
                  role={role}
                  onResolve={handleResolve}
                  onSelect={setSelectedIncident}
                  selectedId={selectedIncident?.id}
                  title={adminIncidentView === "closed" ? "Closed Incidents" : "Active Incidents"}
                  emptyMessage={adminIncidentView === "closed" ? "No closed incidents." : "No active incidents."}
                  onDownloadSummary={handleDownloadSummary}
                  downloadingSummaryId={downloadingIncidentId}
                  availableStaff={availableStaff}
                  departmentOptions={[...ADMIN_NOTIFY_DEPARTMENTS]}
                  onReassign={handleReassignIncident}
                  onNotifyDepartment={handleNotifyDepartment}
                />
                <div className={`${styles.card} ${styles.adminMapCard}`}>
                  <div className={styles.cardHeader}>
                    <div>
                      <p className={styles.cardEyebrow}>Field view</p>
                      <h3>Live incident map</h3>
                    </div>
                  </div>
                  <LiveMap incidents={activeIncidents} focusIncident={role === "admin" ? activeIncident : selectedIncident} />
                </div>
              </div>
              <aside className={styles.adminSecondary}>
                <div className={styles.sectionHeader}>
                  <h2>Operations</h2>
                  <p>System status and recommendations.</p>
                </div>
                <AnalyticsPanel incidents={rawIncidents} />
                <SuggestionPanel 
                  activeScenario={selectedScenario} 
                  severity={simSeverity} 
                />
              </aside>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
