"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "@/styles/dashboard.module.css";
import { Incident, UserRole } from "@/types";

interface IncidentListProps {
  incidents: Incident[];
  role: UserRole;
  onResolve: (incident: Incident) => Promise<void>;
  onSelect?: (incident: Incident) => void;
  selectedId?: string;
  title?: string;
  emptyMessage?: string;
  onDownloadSummary?: (incident: Incident) => void | Promise<void>;
  downloadingSummaryId?: string | null;
}

const priorityClass: Record<Incident["severity"], string> = {
  critical: styles.priorityHigh,
  high: styles.priorityHigh,
  medium: styles.priorityMedium,
  low: styles.priorityLow
};

export default function IncidentList({
  incidents,
  role,
  onResolve,
  onSelect,
  selectedId,
  title = "Active Incidents",
  emptyMessage = "No active incidents.",
  onDownloadSummary,
  downloadingSummaryId
}: IncidentListProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [confirmIncident, setConfirmIncident] = useState<Incident | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolvedIds, setResolvedIds] = useState<Record<string, boolean>>({});

  const getGuestEmail = (incident: Incident) => {
    return incident.guestEmail || "Email not available";
  };

  const toggleExpanded = (incidentId: string) => {
    setExpanded((prev) => ({ ...prev, [incidentId]: !prev[incidentId] }));
  };

  const handleConfirmResolve = async () => {
    if (!confirmIncident) return;
    setResolvingId(confirmIncident.id);
    try {
      await onResolve(confirmIncident);
      setResolvedIds((prev) => ({ ...prev, [confirmIncident.id]: true }));
    } finally {
      setResolvingId(null);
      setConfirmIncident(null);
    }
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (confirmIncident) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
    return undefined;
  }, [confirmIncident]);

  return (
    <div className={`${styles.card} ${styles.full}`}>
      <div className={styles.cardHeader}>
        <h3>{title}</h3>
        <span>{incidents.length} items</span>
      </div>
      <div className={styles.incidentList}>
        {incidents.map((incident) => (
          <article
            key={incident.id}
            className={styles.incidentItem}
            style={selectedId === incident.id ? { borderColor: "var(--primary)" } : undefined}
            onClick={() => onSelect?.(incident)}
          >
            <div className={styles.incidentHeader}>
              <div>
                <p className={styles.incidentType}>{incident.type.toUpperCase()}</p>
                <span className={styles.incidentSource}>{incident.source.toUpperCase()}</span>
              </div>
              <span className={`${styles.incidentBadge} ${priorityClass[incident.severity]}`}>
                {incident.severity}
              </span>
            </div>
            {resolvedIds[incident.id] && (
              <span className={styles.incidentResolved} aria-live="polite">
                ✓ Resolved
              </span>
            )}
            <div className={styles.incidentKeyRow}>
              <div>
                <span>Guest</span>
                <strong>{getGuestEmail(incident)}</strong>
              </div>
              <div>
                <span>Room</span>
                <strong>{incident.guestRoomNumber ?? "Room not available"}</strong>
              </div>
              <div>
                <span>Assigned</span>
                <strong>{incident.assignedStaffName ?? "Pending staff"}</strong>
              </div>
            </div>
            <div className={styles.incidentSecondaryRow}>
              <span>People affected: {incident.affectedPeople ?? 0}</span>
              <span>{new Date(incident.createdAt).toLocaleString()}</span>
            </div>
            <div className={expanded[incident.id] ? styles.detailExpanded : styles.detailClamp}>
              <p>
                <strong>Staff Email:</strong> {incident.assignedStaffEmail ?? "Staff email unavailable"}
              </p>
              <p>{incident.notes ?? "No additional details"}</p>
            </div>
            <footer className={styles.incidentFooter}>
              <button
                className={styles.ghostButton}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleExpanded(incident.id);
                }}
              >
                {expanded[incident.id] ? "Hide details" : "View details"}
              </button>
              {role === "admin" && incident.status !== "resolved" && (
                <button
                  className={styles.primaryButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    setConfirmIncident(incident);
                  }}
                  disabled={resolvingId === incident.id}
                >
                  {resolvingId === incident.id ? "Closing..." : "Close Incident"}
                </button>
              )}
              {role === "admin" && onDownloadSummary && (
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void onDownloadSummary(incident);
                  }}
                  disabled={downloadingSummaryId === incident.id}
                >
                  {downloadingSummaryId === incident.id ? "Preparing PDF..." : "Download Summary PDF"}
                </button>
              )}
            </footer>
          </article>
        ))}
        {incidents.length === 0 && <p>{emptyMessage}</p>}
      </div>
      {confirmIncident && typeof document !== "undefined"
        ? createPortal(
            <div className={styles.confirmOverlay} role="dialog" aria-modal="true">
              <div className={styles.confirmModal}>
                <h4>Close this incident?</h4>
                <p>
                  This will mark the incident as resolved and notify the team.
                </p>
                <div className={styles.confirmActions}>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => setConfirmIncident(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={handleConfirmResolve}
                    disabled={resolvingId === confirmIncident.id}
                  >
                    Confirm close
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
