"use client";

import styles from "@/styles/dashboard.module.css";
import { Incident, UserRole } from "@/types";

interface IncidentListProps {
  incidents: Incident[];
  role: UserRole;
  onAssign: (incident: Incident) => Promise<void>;
  onResolve: (incident: Incident) => Promise<void>;
  onSelect?: (incident: Incident) => void;
  selectedId?: string;
}

const priorityClass = {
  high: styles.priorityHigh,
  medium: styles.priorityMedium,
  low: styles.priorityLow
};

export default function IncidentList({
  incidents,
  role,
  onAssign,
  onResolve,
  onSelect,
  selectedId
}: IncidentListProps) {
  const getGuestEmail = (incident: Incident) => {
    return incident.guestEmail || "Email not available";
  };

  return (
    <div className={`${styles.card} ${styles.full}`}>
      <div className={styles.cardHeader}>
        <h3>Active Incidents</h3>
        <span>{incidents.length} live</span>
      </div>
      <div className={styles.incidentList}>
        {incidents.map((incident) => (
          <article
            key={incident.id}
            className={styles.incidentItem}
            style={selectedId === incident.id ? { borderColor: "var(--primary)" } : undefined}
            onClick={() => onSelect?.(incident)}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{incident.type.toUpperCase()}</strong>
              <span className={priorityClass[incident.priority]}>● {incident.priority}</span>
            </div>
            <p>
              <strong>Guest Email:</strong> {getGuestEmail(incident)}
            </p>
            <p>{incident.notes ?? "No additional details"}</p>
            <small>{new Date(incident.createdAt).toLocaleString()}</small>
            <footer style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
              {role !== "guest" && incident.status !== "resolved" && (
                <button
                  className={styles.secondaryButton}
                  onClick={() => onAssign(incident)}
                >
                  {incident.assignedStaffId ? "Reassign" : "Accept"}
                </button>
              )}
              {role !== "guest" && (
                <button
                  className={styles.primaryButton}
                  onClick={() => onResolve(incident)}
                >
                  {incident.status === "resolved" ? "Reopen" : "Resolve"}
                </button>
              )}
            </footer>
          </article>
        ))}
        {incidents.length === 0 && <p>No incidents yet.</p>}
      </div>
    </div>
  );
}
