"use client";

import { useState } from "react";
import styles from "@/styles/dashboard.module.css";
import { EMERGENCY_TYPES } from "@/lib/constants";
import { IncidentType, LocationPoint } from "@/types";

interface EmergencyPanelProps {
  onTrigger: (type: IncidentType, notes?: string) => Promise<void>;
  currentLocation?: LocationPoint;
}

export default function EmergencyPanel({ onTrigger, currentLocation }: EmergencyPanelProps) {
  const [selected, setSelected] = useState<IncidentType>("fire");
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const toneMap: Record<IncidentType, { icon: string; toneClass: string }> = {
    fire: { icon: "🔥", toneClass: styles.emergencyFire },
    medical: { icon: "⛑️", toneClass: styles.emergencyMedical },
    security: { icon: "🛡️", toneClass: styles.emergencySecurity }
  };

  const handleAlert = async () => {
    setSending(true);
    setStatus(null);
    try {
      await onTrigger(selected, notes);
      setStatus("Help is on the way.");
      setConfirming(false);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Unable to send alert");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`${styles.card} ${styles.emergencyPad}`}>
      <div className={styles.cardHeader}>
        <h3>Emergency Controls</h3>
        {currentLocation?.label && <span className={styles.rolePill}>{currentLocation.label}</span>}
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
              setSelected(item.type);
              setConfirming(true);
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
      {confirming && (
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
            <button className={styles.primaryButton} type="button" disabled={sending} onClick={handleAlert}>
              {sending ? "Sending..." : "Trigger Alert"}
            </button>
            <button className={styles.secondaryButton} type="button" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {status && (
        <small className={styles.statusPulse} role="status" aria-live="polite">
          {status}
        </small>
      )}
    </div>
  );
}
