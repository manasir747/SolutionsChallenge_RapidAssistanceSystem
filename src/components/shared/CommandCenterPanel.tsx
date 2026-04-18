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
  const [hasBuiltRecommendations, setHasBuiltRecommendations] = useState(false);
  const activeIncidents = useMemo(() => incidents.filter((incident) => incident.status !== "resolved"), [incidents]);

  const normalizeDetail = (value: string) =>
    value
      .replace(/\*\*/g, "")
      .replace(/#+\s*/g, "")
      .replace(/\s+\n/g, "\n")
      .trim();

  const buildRecommendationList = (items: RecommendationCard[], fallbackItems: string[]) => {
    if (items.length) {
      return items
        .map((item) => normalizeDetail(item.detail))
        .flatMap((detail) => detail.split(/\n+|\.\s+/))
        .filter(Boolean)
        .slice(0, 4);
    }
    return fallbackItems.slice(0, 4);
  };

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

  const loadRecommendations = async () => {
    if (!incidents.length) {
      setRecommendations([]);
      setHasBuiltRecommendations(true);
      return;
    }

    setLoadingRecommendations(true);
    setHasBuiltRecommendations(true);
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

  const latestIncident = activeIncident ?? activeIncidents[0];
  const activeAssignments = activeIncidents;
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

  const recommendationItems = buildRecommendationList(recommendations, actionPlan);

  return (
    <section className={styles.commandShell}>
      <div className={styles.sectionHeading}>
        <span>Command summary</span>
        <h2>Incident overview</h2>
        <p>{signalSummary}</p>
      </div>

      {offlineActive && (
        <div className={styles.offlineBanner} role="status">
          <strong>Offline Mode Active</strong>
          <p>Local fallbacks and cached guidance are being used until connectivity returns.</p>
        </div>
      )}

      <div className={styles.commandSummary}>
        <div className={styles.summaryRow}>
          <div>
            <p className={styles.summaryLabel}>Current incident</p>
            <strong>{latestIncident ? latestIncident.type.toUpperCase() : "Standby"}</strong>
            <span>{latestIncident ? INCIDENT_SOURCE_LABELS[latestIncident.source] : "No source"}</span>
          </div>
          <div>
            <p className={styles.summaryLabel}>Risk</p>
            <strong>{riskLevel}</strong>
            <span>{latestIncident ? latestIncident.status.replace(/_/g, " ") : "Idle"}</span>
          </div>
          <div>
            <p className={styles.summaryLabel}>People affected</p>
            <strong>{latestIncident?.affectedPeople ?? 0}</strong>
            <span>{latestIncident ? "Active" : "Monitoring"}</span>
          </div>
          <div>
            <p className={styles.summaryLabel}>Assignments</p>
            <strong>{activeAssignments.length}</strong>
            <span>{assignedTeam.length ? assignedTeam.join(", ") : "Awaiting team"}</span>
          </div>
        </div>

        <div className={styles.summaryDivider} />

        <div className={styles.summaryGrid}>
          <div>
            <div className={styles.cardHeader}>
              <h3>Recommended actions</h3>
              <button className={styles.secondaryButton} type="button" onClick={loadRecommendations} disabled={loadingRecommendations}>
                {hasBuiltRecommendations ? "Rebuild Recommendations" : "Build Recommendations"}
              </button>
            </div>
            {loadingRecommendations ? (
              <p className={styles.commandBody}>Building recommendations...</p>
            ) : !hasBuiltRecommendations ? (
              <p className={styles.commandBody}>Click Build Recommendations to generate Gemini guidance.</p>
            ) : (
              <ul className={styles.summaryList}>
                {recommendationItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3>Dispatch + notifications</h3>
            <ul className={styles.summaryList}>
              {(dispatchList.length ? dispatchList : ["No dispatches yet"]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className={styles.commandBody}>{spread}</p>
          </div>
        </div>
      </div>
    </section>
  );
}