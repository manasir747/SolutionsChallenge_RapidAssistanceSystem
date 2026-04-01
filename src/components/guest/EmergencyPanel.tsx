"use client";

import { useState } from "react";
import styles from "@/styles/dashboard.module.css";
import { EMERGENCY_TYPES } from "@/lib/constants";
import { IncidentType, LocationPoint } from "@/types";

interface EmergencyPanelProps {
  onTrigger: (type: IncidentType, notes?: string) => Promise<void>;
  currentLocation?: LocationPoint;
}

type PanelState = "idle" | "confirm" | "sending" | "success";

const RESPONDERS = ["Rescue Team Bravo", "Medical Unit Echo", "Security Patrol Delta"];

export default function EmergencyPanel({ onTrigger, currentLocation }: EmergencyPanelProps) {
  const [selected, setSelected] = useState<IncidentType>("fire");
  const [notes, setNotes] = useState("");
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [responseMeta, setResponseMeta] = useState<{ eta: string; responder: string } | null>(null);

  const toneMap: Record<IncidentType, { icon: string; toneClass: string }> = {
    fire: { icon: "🔥", toneClass: styles.emergencyFire },
    medical: { icon: "⛑️", toneClass: styles.emergencyMedical },
    security: { icon: "🛡️", toneClass: styles.emergencySecurity }
  };

  const beginFlow = (type: IncidentType) => {
    setSelected(type);
    setPanelState("confirm");
    setFeedback(null);
  };

  const handleAlert = async () => {
    setPanelState("sending");
    setFeedback(null);
    try {
      await onTrigger(selected, notes);
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

  return (
    <div className={`${styles.card} ${styles.emergencyPad}`}>
      <div className={styles.cardHeader}>
        <h3>Emergency Controls</h3>
        {currentLocation?.label && <span className={styles.rolePill}>{currentLocation.label}</span>}
      </div>
      <div className={styles.emergencyHeroCentered}>
        <div>
          <p className={styles.cardEyebrow}>Assistance Request</p>
          <h2 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>In case of emergency</h2>
          <p>The Response Team will be dispatched to your location immediately.</p>
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
      <div className={styles.emergencyTypes}>
        {EMERGENCY_TYPES.map((item) => (
          <button
            key={item.type}
            type="button"
            className={`${styles.emergencyButton} ${toneMap[item.type].toneClass}`}
            data-selected={selected === item.type}
            aria-pressed={selected === item.type}
            onClick={() => {
              beginFlow(item.type);
            }}
            title={`Trigger a ${item.label} alert`}
          >
            <span className={styles.emergencyIcon} aria-hidden="true">
              {toneMap[item.type].icon}
            </span>
            <div className={styles.emergencyCopy}>
              <strong>{item.label}</strong>
              <p>{item.hint}</p>
            </div>
          </button>
        ))}
      </div>
      {panelState === "confirm" && (
        <div className={styles.confirmPane}>
          <p>
            Confirm <strong>{selected.toUpperCase()}</strong> alert?
          </p>
          <textarea
            className={styles.confirmTextarea}
            placeholder="Add context for responders"
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
