"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/styles/dashboard.module.css";
import { INCIDENT_SOURCE_LABELS } from "@/lib/constants";
import { Incident } from "@/types";

interface CommandCenterPanelProps {
  incidents: Incident[];
  activeIncident?: Incident;
}

type RecommendationCard = {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "warning" | "critical";
};

const emergencyDispatches: Record<Incident["type"], string[]> = {
  fire: ["Fire dept notified", "Ambulance alerted", "Police dispatched"],
  medical: ["Ambulance alerted", "Medical staff dispatched", "Police on standby"],
  security: ["Security team mobilized", "Police dispatched", "Manager notified"],
  theft: ["Police dispatched", "Security team mobilized", "Asset audit started"]
};

const riskLookup: Record<Incident["severity"], string> = {
  low: "Low",
  medium: "Elevated",
  high: "High",
  critical: "Critical"
};

const spreadLookup: Record<Incident["type"], string> = {
  fire: "High spread possibility across shared corridors.",
  medical: "Low spread possibility, but response urgency is high.",
  security: "Limited spatial spread, but escalation risk is high.",
  theft: "Localized disruption with moderate operational impact."
};

const actionLookup: Record<Incident["type"], string[]> = {
  fire: ["Cut off affected wing", "Guide guests to stairwell exits", "Stage fire teams at service access"],
  medical: ["Clear room for treatment", "Escort responders to guest", "Prepare transport route"],
  security: ["Lock down entry points", "Review CCTV feeds", "Brief manager and security lead"],
  theft: ["Preserve CCTV and access logs", "Secure valuables desk", "Prepare police handoff" ]
};

export default function CommandCenterPanel({ incidents, activeIncident }: CommandCenterPanelProps) {
  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [offlineActive, setOfflineActive] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      const syncOfflineState = () => setOfflineActive(!navigator.onLine);
      syncOfflineState();
      window.addEventListener("online", syncOfflineState);
      window.addEventListener("offline", syncOfflineState);
      return () => {
        window.removeEventListener("online", syncOfflineState);
        window.removeEventListener("offline", syncOfflineState);
      };
    }
    return undefined;
  }, []);

  useEffect(() => {
    const loadRecommendations = async () => {
      if (!incidents.length) {
        setRecommendations([]);
        return;
      }

      setLoadingRecommendations(true);
      try {
        const response = await fetch("/api/ai/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ incidents })
        });

        const data = (await response.json()) as { suggestions?: RecommendationCard[] };
        setRecommendations((data.suggestions ?? []).slice(0, 3));
      } catch {
        const fallback: RecommendationCard[] = incidents.slice(0, 3).map((incident, index) => ({
          id: `fallback-${index}`,
          title: `${incident.type.toUpperCase()} response`,
          detail: `Track ${incident.type} from ${INCIDENT_SOURCE_LABELS[incident.source]} and keep escalation ready.`,
          severity: incident.severity === "critical" ? "critical" : "warning"
        }));
        setRecommendations(fallback);
      } finally {
        setLoadingRecommendations(false);
      }
    };

    void loadRecommendations();
  }, [incidents]);

  const latestIncident = activeIncident ?? incidents[0];
  const activeAssignments = incidents.filter((incident) => incident.status !== "resolved");
  const assignedTeam = latestIncident?.assignedTeam ?? [];
  const dispatchList = latestIncident ? emergencyDispatches[latestIncident.type] : [];
  const actionPlan = latestIncident ? actionLookup[latestIncident.type] : [];
  const riskLevel = latestIncident ? riskLookup[latestIncident.severity] : "Stable";
  const spread = latestIncident ? spreadLookup[latestIncident.type] : "No active incident spread detected.";

  const signalSummary = useMemo(() => {
    if (!latestIncident) {
      return "No active incidents detected. System is standing by.";
    }
    return `${latestIncident.type.toUpperCase()} detected via ${INCIDENT_SOURCE_LABELS[latestIncident.source]} at ${new Date(
      latestIncident.timestamp ?? latestIncident.createdAt
    ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }, [latestIncident]);

  return (
    <section className={styles.commandShell}>
      <div className={styles.sectionHeading}>
        <span>AI Command Center</span>
        <h2>Unified incident intelligence for every role.</h2>
        <p>{signalSummary}</p>
      </div>

      {offlineActive && (
        <div className={styles.offlineBanner} role="status">
          <strong>Offline Mode Active</strong>
          <p>Local fallbacks and cached guidance are being used until connectivity returns.</p>
        </div>
      )}

      <div className={styles.commandGrid}>
        <article className={styles.commandCard}>
          <p className={styles.cardEyebrow}>Incident profile</p>
          <h3>{latestIncident ? latestIncident.type.toUpperCase() : "Standby"}</h3>
          <ul className={styles.commandList}>
            <li>
              <strong>Source</strong>
              <span>{latestIncident ? INCIDENT_SOURCE_LABELS[latestIncident.source] : "No source"}</span>
            </li>
            <li>
              <strong>Severity</strong>
              <span>{riskLevel}</span>
            </li>
            <li>
              <strong>People affected</strong>
              <span>{latestIncident?.affectedPeople ?? 0}</span>
            </li>
            <li>
              <strong>Status</strong>
              <span>{latestIncident ? latestIncident.status.replace(/_/g, " ") : "Idle"}</span>
            </li>
          </ul>
        </article>

        <article className={styles.commandCard}>
          <p className={styles.cardEyebrow}>Predictive intelligence</p>
          <h3>Risk level & spread</h3>
          <div className={styles.commandMetricRow}>
            <div>
              <span>Risk</span>
              <strong>{riskLevel}</strong>
            </div>
            <div>
              <span>Spread</span>
              <strong>{latestIncident ? "Monitor closely" : "Stable"}</strong>
            </div>
          </div>
          <p className={styles.commandBody}>{spread}</p>
          <div className={styles.commandTags}>
            {(latestIncident ? actionPlan.slice(0, 2) : ["Waiting for incident data"]).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </article>

        <article className={styles.commandCard}>
          <p className={styles.cardEyebrow}>Staff automation</p>
          <h3>Auto-assigned team</h3>
          <div className={styles.commandTags}>
            {assignedTeam.length ? assignedTeam.map((team) => <span key={team}>{team}</span>) : <span>Awaiting assignment</span>}
          </div>
          <p className={styles.commandBody}>Role automation routes every incident to the right mix of security, staff, and manager coverage.</p>
          <div className={styles.commandStack}>
            <strong>Emergency integration</strong>
            <span>{dispatchList.join(" • ") || "Waiting for alert trigger"}</span>
          </div>
        </article>

        <article className={styles.commandCard}>
          <p className={styles.cardEyebrow}>Gemini recommendations</p>
          <h3>Action plan</h3>
          {loadingRecommendations ? (
            <p className={styles.commandBody}>Building recommendations...</p>
          ) : (
            <ul className={styles.recommendationList}>
              {(recommendations.length ? recommendations : actionPlan.map((item, index) => ({
                id: `action-${index}`,
                title: "Action",
                detail: item,
                severity: "info" as const
              }))).map((item) => (
                <li key={item.id} className={`${styles.recommendationItem} ${styles[`recommendation${item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}`]}`}>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className={styles.commandCard}>
          <p className={styles.cardEyebrow}>Live assignment board</p>
          <h3>Staff mapped to guests</h3>
          <ul className={styles.assignmentList}>
            {activeAssignments.length ? (
              activeAssignments.map((incident) => (
                <li key={incident.id} className={styles.assignmentItem}>
                  <div>
                    <strong>{incident.assignedStaffName ?? "Pending staff"}</strong>
                    <p>{incident.assignedStaffEmail ?? "Staff email unavailable"}</p>
                  </div>
                  <div>
                    <strong>{incident.guestEmail ?? "Guest email unavailable"}</strong>
                    <p>Room {incident.guestRoomNumber ?? "pending"}</p>
                  </div>
                  <div>
                    <strong>{incident.type.toUpperCase()}</strong>
                    <p>{incident.assignedStaffDepartment ?? "General Response"}</p>
                  </div>
                </li>
              ))
            ) : (
              <li className={styles.assignmentEmpty}>No active assignments.</li>
            )}
          </ul>
        </article>

        <article className={styles.commandCard}>
          <p className={styles.cardEyebrow}>Department notifications</p>
          <h3>External emergency integration</h3>
          <ul className={styles.departmentList}>
            {activeAssignments.length ? (
              activeAssignments.map((incident) => (
                <li key={`dept-${incident.id}`}>
                  <strong>{incident.type.toUpperCase()}</strong>
                  <span>{(incident.notifiedDepartments ?? dispatchList).join(" • ")}</span>
                </li>
              ))
            ) : (
              <li>
                <strong>Standby</strong>
                <span>No notifications dispatched.</span>
              </li>
            )}
          </ul>
        </article>
      </div>
    </section>
  );
}