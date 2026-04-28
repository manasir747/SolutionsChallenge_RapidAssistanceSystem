"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Flame,
  HeartPulse,
  Package,
  ShieldAlert,
  UserPlus
} from "lucide-react";
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
  availableStaff?: Array<{
    id: string;
    email: string;
    displayName?: string;
    department?: string;
  }>;
  departmentOptions?: string[];
  onReassign?: (incident: Incident, staffId: string) => Promise<void>;
  onNotifyDepartment?: (incident: Incident, department: string) => Promise<void>;
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
  downloadingSummaryId,
  availableStaff = [],
  departmentOptions = [],
  onReassign,
  onNotifyDepartment
}: IncidentListProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [confirmIncident, setConfirmIncident] = useState<Incident | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolvedIds, setResolvedIds] = useState<Record<string, boolean>>({});
  const [selectedStaffId, setSelectedStaffId] = useState<Record<string, string>>({});
  const [selectedDepartment, setSelectedDepartment] = useState<Record<string, string>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [notifyingKey, setNotifyingKey] = useState<string | null>(null);

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

  const handleAssign = async (incident: Incident) => {
    const staffId = selectedStaffId[incident.id] ?? incident.assignedStaffId ?? "";
    if (!staffId || !onReassign) return;

    setAssigningId(incident.id);
    try {
      await onReassign(incident, staffId);
    } finally {
      setAssigningId(null);
    }
  };

  const handleNotify = async (incident: Incident) => {
    const department = selectedDepartment[incident.id] ?? "";
    if (!department || !onNotifyDepartment) return;

    const actionKey = `${incident.id}:${department}`;
    setNotifyingKey(actionKey);
    try {
      await onNotifyDepartment(incident, department);
    } finally {
      setNotifyingKey(null);
    }
  };

  const getIncidentIcon = (type: Incident["type"]) => {
    switch (type) {
      case "fire":
        return <Flame size={18} />;
      case "medical":
        return <HeartPulse size={18} />;
      case "security":
        return <ShieldAlert size={18} />;
      case "theft":
      default:
        return <Package size={18} />;
    }
  };

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
            className={`${styles.incidentItem} ${styles[`incident${incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}`]} ${
              selectedId === incident.id ? styles.incidentSelected : ""
            }`}
            style={selectedId === incident.id ? { borderColor: "var(--primary)" } : undefined}
            onClick={() => onSelect?.(incident)}
          >
            <div className={styles.incidentHeader}>
              <div className={styles.incidentTitleRow}>
                <span className={styles.incidentIcon} aria-hidden="true">
                  {getIncidentIcon(incident.type)}
                </span>
                <div>
                  <p className={styles.incidentType}>{incident.type.toUpperCase()}</p>
                  <span className={styles.incidentSource}>{incident.source.toUpperCase()}</span>
                </div>
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
                className={`${styles.ghostButton} ${styles.iconButton}`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleExpanded(incident.id);
                }}
              >
                {expanded[incident.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {expanded[incident.id] ? "Hide details" : "View details"}
              </button>
              {role === "admin" && incident.status !== "resolved" && (
                <button
                  className={`${styles.primaryButton} ${styles.iconButton}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setConfirmIncident(incident);
                  }}
                  disabled={resolvingId === incident.id}
                >
                  <CheckCircle2 size={16} />
                  {resolvingId === incident.id ? "Closing..." : "Close Incident"}
                </button>
              )}
              {role === "admin" && onDownloadSummary && (
                <button
                  className={`${styles.secondaryButton} ${styles.iconButton}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void onDownloadSummary(incident);
                  }}
                  disabled={downloadingSummaryId === incident.id}
                >
                  <FileText size={16} />
                  {downloadingSummaryId === incident.id ? "Preparing PDF..." : "Download Summary PDF"}
                </button>
              )}
            </footer>
            {role === "admin" && (
              <div
                className={styles.adminIncidentControls}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <div className={styles.adminIncidentControlRow}>
                  <label htmlFor={`assign-${incident.id}`}>Reassign response staff</label>
                  <div className={styles.adminIncidentControlInline}>
                    {(() => {
                      const currentStaffId = selectedStaffId[incident.id] ?? incident.assignedStaffId ?? "";
                      const staffExists = availableStaff.some((staff) => staff.id === currentStaffId);

                      return (
                        <>
                          <select
                            id={`assign-${incident.id}`}
                            className={styles.adminIncidentSelect}
                            value={currentStaffId}
                            onChange={(event) =>
                              setSelectedStaffId((prev) => ({
                                ...prev,
                                [incident.id]: event.target.value
                              }))
                            }
                          >
                            <option value="">Select staff email</option>
                            {availableStaff.map((staff) => (
                              <option key={staff.id} value={staff.id}>
                                {staff.email}
                              </option>
                            ))}
                          </select>
                          <button
                            className={`${styles.secondaryButton} ${styles.iconButton}`}
                            type="button"
                            onClick={() => void handleAssign(incident)}
                            disabled={assigningId === incident.id || !currentStaffId || !staffExists}
                          >
                            <UserPlus size={16} />
                            {assigningId === incident.id ? "Assigning..." : "Assign"}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                  {availableStaff.length === 0 && (
                    <small className={styles.adminIncidentHint}>No staff accounts available for reassignment.</small>
                  )}
                </div>

                <div className={styles.adminIncidentControlRow}>
                  <label htmlFor={`notify-${incident.id}`}>Notify more departments</label>
                  <div className={styles.adminIncidentControlInline}>
                    <select
                      id={`notify-${incident.id}`}
                      className={styles.adminIncidentSelect}
                      value={selectedDepartment[incident.id] ?? ""}
                      onChange={(event) =>
                        setSelectedDepartment((prev) => ({
                          ...prev,
                          [incident.id]: event.target.value
                        }))
                      }
                    >
                      <option value="">Select department</option>
                      {departmentOptions.map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>
                    <button
                      className={`${styles.secondaryButton} ${styles.iconButton}`}
                      type="button"
                      onClick={() => void handleNotify(incident)}
                      disabled={
                        !selectedDepartment[incident.id] ||
                        notifyingKey === `${incident.id}:${selectedDepartment[incident.id]}`
                      }
                    >
                      <Bell size={16} />
                      {notifyingKey === `${incident.id}:${selectedDepartment[incident.id]}` ? "Notifying..." : "Notify"}
                    </button>
                  </div>
                  <small className={styles.adminIncidentHint}>
                    Currently notified: {(incident.notifiedDepartments ?? []).join(", ") || "No departments notified yet"}
                  </small>
                </div>
              </div>
            )}
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
