"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/styles/dashboard.module.css";
import { EMERGENCY_TYPES, INCIDENT_SOURCE_LABELS } from "@/lib/constants";
import { Incident, IncidentSource, IncidentType, LocationPoint } from "@/types";

interface EmergencyPanelProps {
  onTrigger: (type: IncidentType, source: IncidentSource, notes?: string) => Promise<void>;
  currentLocation?: LocationPoint;
  activeIncident?: Incident;
}

type PanelState = "idle" | "confirm" | "sending" | "success";

const RESPONDERS = ["Rescue Team Bravo", "Medical Unit Echo", "Security Patrol Delta"];

const guidanceByType: Record<IncidentType, string> = {
  fire: "Move toward the nearest stairwell and avoid elevators.",
  medical: "Keep the guest visible and clear a safe working area.",
  security: "Retain distance and share the last known location.",
  theft: "Preserve the scene and avoid confronting the suspect."
};

const nextStepsByType: Record<IncidentType, string[]> = {
  fire: ["Move low and avoid elevators.", "Cover mouth and nose while moving.", "Wait at the assigned safe zone for responders."],
  medical: ["Keep the patient visible and calm.", "Clear immediate space for responders.", "Share symptom updates when help arrives."],
  security: ["Move away from threat direction.", "Stay in a lockable safe area.", "Share suspect details with responders."],
  theft: ["Avoid touching evidence around the scene.", "Move to a safe monitored area.", "Share timeline and item details with security."]
};

const notifiedByType: Record<IncidentType, string[]> = {
  fire: ["Fire Department", "Emergency Medical Services", "Police Department"],
  medical: ["Emergency Medical Services", "Hospital Liaison"],
  security: ["Hotel Security Department", "Police Department"],
  theft: ["Hotel Security Department", "Police Department"]
};

const sourceTone: Record<IncidentSource, string> = {
  manual: "Manual request",
  iot: "Sensor detection",
  cctv: "CCTV / AI detection"
};

type TriggerTarget = {
  type: IncidentType;
  source: IncidentSource;
  label: string;
  hint: string;
};

export default function EmergencyPanel({ onTrigger, currentLocation, activeIncident }: EmergencyPanelProps) {
  const [selected, setSelected] = useState<TriggerTarget>({
    type: "fire",
    source: "manual",
    label: "Fire",
    hint: "Smoke, alarm, structural"
  });
  const [notes, setNotes] = useState("");
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [responseMeta, setResponseMeta] = useState<{ eta: string; responder: string } | null>(null);
  const [offlineActive, setOfflineActive] = useState(false);

  const toneMap: Record<IncidentType, { icon: string; toneClass: string }> = {
    fire: { icon: "🔥", toneClass: styles.emergencyFire },
    medical: { icon: "⛑️", toneClass: styles.emergencyMedical },
    security: { icon: "🛡️", toneClass: styles.emergencySecurity },
    theft: { icon: "🎥", toneClass: styles.emergencySecurity }
  };

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const syncOnlineState = () => setOfflineActive(!navigator.onLine);
    syncOnlineState();
    window.addEventListener("online", syncOnlineState);
    window.addEventListener("offline", syncOnlineState);
    return () => {
      window.removeEventListener("online", syncOnlineState);
      window.removeEventListener("offline", syncOnlineState);
    };
  }, []);

  const triggerGroups = useMemo(
    () => [
      {
        title: "Manual triggers",
        items: EMERGENCY_TYPES.map((item) => ({ ...item, source: "manual" as const }))
      }
    ],
    []
  );

  const beginFlow = (target: TriggerTarget) => {
    setSelected(target);
    setPanelState("confirm");
    setFeedback(null);
  };

  const handleAlert = async () => {
    setPanelState("sending");
    setFeedback(null);
    try {
      await onTrigger(selected.type, selected.source, notes);
      const eta = `${Math.floor(Math.random() * 3) + 2} min`;
      const responder = RESPONDERS[Math.floor(Math.random() * RESPONDERS.length)];
      setResponseMeta({ eta, responder });
      setPanelState("success");
      setNotes("");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Unable to send alert");
      setPanelState("confirm");
    }
  };

  const resetPanel = () => {
    setPanelState("idle");
    setResponseMeta(null);
    setFeedback(null);
  };

  const isSending = panelState === "sending";
  const incidentInProgress = activeIncident && activeIncident.status !== "resolved" ? activeIncident : undefined;

  if (incidentInProgress) {
    const etaMinutes = Math.max(1, Math.round((incidentInProgress.responderDistanceMeters ?? 180) / 85));
    const dispatchTargets = incidentInProgress.notifiedDepartments?.length
      ? incidentInProgress.notifiedDepartments
      : notifiedByType[incidentInProgress.type];

    return (
      <div className={`${styles.card} ${styles.emergencyPad}`}>
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.cardEyebrow}>Guest response status</p>
            <h3>Incident raised successfully</h3>
          </div>
          {currentLocation?.label && <span className={styles.rolePill}>{currentLocation.label}</span>}
        </div>
        <div className={`${styles.alertState} ${styles.alertSuccess}`}>
          <p className={styles.alertHeading}>Live incident: {incidentInProgress.type.toUpperCase()}</p>
          <strong>{incidentInProgress.status.replace(/_/g, " ")} • Help lead en route</strong>
          <div className={styles.alertMeta}>
            <div>
              <span>Help lead</span>
              <p>{incidentInProgress.assignedStaffName ?? "Auto-assigned responder"}</p>
            </div>
            <div>
              <span>Distance</span>
              <p>{incidentInProgress.responderDistanceMeters ?? 0}m away</p>
            </div>
            <div>
              <span>ETA</span>
              <p>{etaMinutes} min</p>
            </div>
          </div>
          <p className={styles.alertSubtext}>{guidanceByType[incidentInProgress.type]}</p>
          <div>
            <p className={styles.cardEyebrow}>Next steps</p>
            <ul className={styles.summaryList}>
              {nextStepsByType[incidentInProgress.type].map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className={styles.cardEyebrow}>Notified teams</p>
            <div className={styles.dispatchStrip}>
              {dispatchTargets.map((team) => (
                <span key={team}>{team}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.card} ${styles.emergencyPad}`}>
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardEyebrow}>Crisis OS triggers</p>
          <h3>Emergency Controls</h3>
        </div>
        {currentLocation?.label && <span className={styles.rolePill}>{currentLocation.label}</span>}
      </div>
      {offlineActive && (
        <div className={styles.offlineBanner} role="status">
          <strong>Offline Mode Active</strong>
          <p>Fallback commands are ready while realtime connectivity is limited.</p>
        </div>
      )}
      <div className={styles.emergencyHeroCentered}>
        <div>
          <p className={styles.cardEyebrow}>Assistance Request</p>
          <h2 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>In case of emergency</h2>
          <p>Raise a manual incident and the Crisis OS will auto-assign the nearest response staff.</p>
        </div>
        <button
          type="button"
          className={styles.emergencyPrimarySuper}
          onClick={() => beginFlow(selected)}
          aria-label="Trigger emergency alert"
        >
          <span>🆘 GET HELP NOW</span>
          <small>Instant Dispatch</small>
        </button>
      </div>
      {triggerGroups.map((group) => (
        <div key={group.title} className={styles.triggerGroup}>
          <div className={styles.triggerGroupHeader}>
            <strong>{group.title}</strong>
            <span>{group.items.length} triggers</span>
          </div>
          <div className={styles.emergencyTypes}>
            {group.items.map((item) => (
              <button
                key={`${group.title}-${item.label}`}
                type="button"
                className={`${styles.emergencyButton} ${toneMap[item.type as IncidentType].toneClass}`}
                data-selected={selected.type === item.type && selected.source === item.source}
                aria-pressed={selected.type === item.type && selected.source === item.source}
                onClick={() => {
                  beginFlow({
                    type: item.type as IncidentType,
                    source: item.source,
                    label: item.label,
                    hint: item.hint
                  });
                }}
                title={`Trigger ${item.label}`}
              >
                <span className={styles.emergencyIcon} aria-hidden="true">
                  {toneMap[item.type as IncidentType].icon}
                </span>
                <div className={styles.emergencyCopy}>
                  <strong>{item.label}</strong>
                  <p>
                    {item.hint}
                    <br />
                    <span>{sourceTone[item.source]}</span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className={styles.safetyBanner}>
        <div>
          <p className={styles.cardEyebrow}>Guest safety system</p>
          <strong>{selected.label} detected via {INCIDENT_SOURCE_LABELS[selected.source]}</strong>
          <p>{guidanceByType[selected.type]}</p>
        </div>
        <div className={styles.safetyMiniStack}>
          <span>Alert banner active</span>
          <span>Escape guidance visible</span>
        </div>
      </div>
      {panelState === "confirm" && (
        <div className={styles.confirmPane}>
          <p>
            Confirm <strong>{selected.label.toUpperCase()}</strong> alert via {INCIDENT_SOURCE_LABELS[selected.source]}?
          </p>
          <textarea
            className={styles.confirmTextarea}
            placeholder="Add context for responders or AI command center"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className={styles.primaryButton} type="button" disabled={isSending} onClick={handleAlert}>
              {isSending ? "Dispatching" : "Trigger Alert"}
            </button>
            <button className={styles.secondaryButton} type="button" onClick={resetPanel}>
              Cancel
            </button>
          </div>
          {feedback && (
            <small className={styles.statusPulse} role="alert">
              {feedback}
            </small>
          )}
        </div>
      )}

      {panelState === "sending" && (
        <div className={styles.alertState}>
          <p className={styles.alertHeading}>Signal reached command</p>
          <p>Routing responders...</p>
          <div className={styles.alertLoader} aria-hidden="true" />
        </div>
      )}

      {panelState === "success" && responseMeta && (
        <div className={`${styles.alertState} ${styles.alertSuccess}`}>
          <p className={styles.alertHeading}>🚨 Alert sent</p>
          <strong>Help is on the way</strong>
          <div className={styles.alertMeta}>
            <div>
              <span>ETA</span>
              <p>{responseMeta.eta}</p>
            </div>
            <div>
              <span>Responder</span>
              <p>{responseMeta.responder}</p>
            </div>
          </div>
          <p className={styles.alertSubtext}>Stay visible and follow on-screen instructions while the team approaches.</p>
          <div className={styles.dispatchStrip}>
            <span>Ambulance alerted</span>
            <span>Fire dept notified</span>
            <span>Police dispatched</span>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className={styles.secondaryButton} type="button" onClick={resetPanel}>
              Send another alert
            </button>
            <button className={styles.primaryButton} type="button" onClick={() => setPanelState("confirm")}>
              Add more details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
