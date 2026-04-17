"use client";

import { FormEvent, useState } from "react";
import styles from "@/styles/dashboard.module.css";
import { ChatMessage, Incident } from "@/types";

interface ConversationPanelProps {
  incident?: Incident;
  messages: ChatMessage[];
  nearestExit?: {
    label: string;
    distance: number;
  } | null;
  onSend: (text: string) => Promise<void>;
  onStatusChange?: (incidentId: string, status: Incident["status"]) => Promise<void>;
}

const STATUS_LABELS: Record<Incident["status"], string> = {
  pending: "Pending",
  acknowledged: "Acknowledged",
  en_route: "En route",
  resolved: "Resolved"
};

const QUICK_ACTIONS: Array<{
  label: string;
  message: string;
}> = [
  { label: "En route", message: "En route to incident location now." },
  { label: "Reached scene", message: "Reached the scene and assessing conditions." },
  { label: "Evacuation started", message: "Evacuation support has started in the affected area." },
  { label: "Need backup", message: "Need additional staff support at this location." },
  { label: "Guest assisted", message: "Guest has been assisted and moved toward a safer zone." },
  { label: "Area cleared", message: "Area appears clear for now. Continuing to monitor." }
];

const formatStatus = (status: Incident["status"]) => STATUS_LABELS[status] ?? status.replace(/_/g, " ");

const getEtaLabel = (incident: Incident) => {
  if (incident.status === "resolved") return "Complete";
  if (incident.status === "en_route") return incident.priority === "high" ? "1-2 min" : "3-4 min";
  if (incident.status === "acknowledged") return "Dispatch active";
  return incident.priority === "high" ? "Immediate" : "Stand by";
};

export default function ConversationPanel({
  incident,
  messages,
  nearestExit,
  onSend
}: ConversationPanelProps) {
  const [draft, setDraft] = useState("Heading to stairwell C now.");
  const [loading, setLoading] = useState(false);

  if (!incident) {
    return (
      <div className={styles.card}>
        <p>Select an incident to start chatting.</p>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setLoading(true);
    await onSend(draft.trim());
    setDraft("");
    setLoading(false);
  };

  const handleQuickAction = async (action: (typeof QUICK_ACTIONS)[number]) => {
    setLoading(true);
    try {
      await onSend(action.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.card} ${styles.chatPanel}`}>
      <div className={styles.cardHeader}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
          <div>
            <h3>Incident Chat</h3>
        <div className={styles.staffStatusTile}>
          <span>Guest room</span>
          <strong>{incident.guestRoomNumber ?? "Room pending"}</strong>
          <small>{incident.guestEmail ?? "Guest email unavailable"}</small>
        </div>
            <small>{incident.type.toUpperCase()}</small>
            <p style={{ margin: "0.25rem 0 0", color: "rgba(255,255,255,0.65)" }}>
              Source: {incident.source.toUpperCase()} • Severity: {incident.severity}
            </p>
          </div>
          {incident.guestEmail && (
            <div className={styles.guestMetaInfo}>
              <p className={styles.cardEyebrow}>Guest Contact</p>
              <strong>{incident.guestEmail}</strong>
            </div>
          )}
        </div>
      </div>
      <div className={styles.staffStatusStrip}>
        <div className={styles.staffStatusTile}>
          <span>Assignment</span>
          <strong>{incident.location.label ?? "On-site response"}</strong>
          <small>{formatStatus(incident.status)}</small>
        </div>
        <div className={styles.staffStatusTile}>
          <span>Priority</span>
          <strong>{incident.severity.toUpperCase()}</strong>
          <small>{incident.type.toUpperCase()} incident</small>
        </div>
        <div className={styles.staffStatusTile}>
          <span>Nearest exit</span>
          <strong>{nearestExit ? nearestExit.label : "Exit guidance unavailable"}</strong>
          <small>{nearestExit ? `${nearestExit.distance}m away` : "Check live map"}</small>
        </div>
        <div className={styles.staffStatusTile}>
          <span>ETA</span>
          <strong>{getEtaLabel(incident)}</strong>
          <small>Updated {new Date(incident.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
        </div>
      </div>
      <div className={styles.responderActions}>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            className={styles.quickActionButton}
            onClick={() => handleQuickAction(action)}
            disabled={loading}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div className={styles.chatMessages}>
        {messages.map((message) => (
          <div key={message.id} className={styles.chatBubble}>
            <strong>{message.authorRole.toUpperCase()}</strong>
            <p>{message.message}</p>
            <small>{new Date(message.createdAt).toLocaleTimeString()}</small>
          </div>
        ))}
        {messages.length === 0 && <p>No messages yet.</p>}
      </div>
      <form className={styles.chatForm} onSubmit={handleSubmit}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Send update" />
        <button className={styles.primaryButton} disabled={loading}>
          {loading ? "Sending" : "Send"}
        </button>
      </form>
    </div>
  );
}
