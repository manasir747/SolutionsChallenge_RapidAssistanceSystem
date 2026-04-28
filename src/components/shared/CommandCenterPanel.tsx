"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Radar, Siren, Users, Route, ShieldAlert } from "lucide-react";
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
  const statusRank = latestIncident
    ? ({ pending: 0, acknowledged: 1, en_route: 2, resolved: 3 } as const)[latestIncident.status]
    : 0;
  const severityKey = latestIncident?.severity ?? "low";
  const riskChipClass = styles[`risk${severityKey.charAt(0).toUpperCase() + severityKey.slice(1)}`];

  const heroTitle = latestIncident
    ? `${latestIncident.type.toUpperCase()} — ${riskLevel.toUpperCase()} RISK`
    : "SYSTEM STANDBY";

  const timelineSteps = ["Detected", "Acknowledged", "Responding"];
  const dispatchFeed = (dispatchList.length ? dispatchList : ["Awaiting dispatch orders"]).map((item, index) => {
    let state: "pending" | "inProgress" | "completed" | "critical" = "pending";
    if (statusRank >= 3) state = "completed";
    else if (statusRank === 2) state = index === 0 ? "completed" : "inProgress";
    else if (statusRank === 1) state = index === 0 ? "inProgress" : "pending";
    if (latestIncident?.severity === "critical" && index === 0 && statusRank < 3) state = "critical";
    return { label: item, state };
  });

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
    <section className={`${styles.commandShell} ${styles.commandHeroShell}`}>
      <div className={styles.commandHero}>
        <div className={styles.heroPrimary}>
          <div className={styles.heroHeader}>
            <span className={styles.heroKicker}>Incident overview</span>
            <div className={styles.heroTitleRow}>
              <span className={`${styles.severityOrb} ${styles[`severityOrb${severityKey.charAt(0).toUpperCase() + severityKey.slice(1)}`]}`} />
              <div>
                <h2>{heroTitle}</h2>
                <p>{signalSummary}</p>
              </div>
            </div>
            <div className={styles.heroMetaRow}>
              <span className={styles.heroChip}>
                <Radar size={14} /> {latestIncident ? INCIDENT_SOURCE_LABELS[latestIncident.source] : "Monitoring"}
              </span>
              <span className={styles.heroChip}>
                <ShieldAlert size={14} /> {latestIncident ? latestIncident.status.replace(/_/g, " ") : "Standby"}
              </span>
              <span className={styles.heroChip}>
                <Activity size={14} /> {latestIncident?.location?.label ?? "Central grid"}
              </span>
            </div>
          </div>

          <div className={styles.heroTimeline}>
            {timelineSteps.map((label, index) => {
              const stageState = index <= statusRank ? "active" : "pending";
              return (
                <div key={label} className={`${styles.timelineNode} ${styles[`timeline${stageState.charAt(0).toUpperCase() + stageState.slice(1)}`]}`}>
                  <span>{label}</span>
                  <div className={styles.timelinePulse}></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.heroWidgets}>
          <div className={styles.summaryWidget}>
            <Siren size={18} />
            <div>
              <p>Current incident</p>
              <strong>{latestIncident ? latestIncident.type.toUpperCase() : "Standby"}</strong>
            </div>
            <span className={styles.widgetSub}>{latestIncident ? riskLevel : "Stable"}</span>
          </div>
          <div className={styles.summaryWidget}>
            <Users size={18} />
            <div>
              <p>People affected</p>
              <strong>{latestIncident?.affectedPeople ?? 0}</strong>
            </div>
            <span className={styles.widgetSub}>{latestIncident ? "Active" : "Monitoring"}</span>
          </div>
          <div className={styles.summaryWidget}>
            <Route size={18} />
            <div>
              <p>Assignments</p>
              <strong>{activeAssignments.length}</strong>
            </div>
            <span className={styles.widgetSub}>{assignedTeam.length ? assignedTeam.join(", ") : "Awaiting team"}</span>
          </div>
        </div>
      </div>

      {offlineActive && (
        <div className={styles.offlineBanner} role="status">
          <strong>Offline Mode Active</strong>
          <p>Local fallbacks and cached guidance are being used until connectivity returns.</p>
        </div>
      )}

      <div className={styles.commandSummary}>
        <div className={styles.summaryGrid}>
          <div className={styles.commandPanel}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.cardEyebrow}>AI Suggestions</p>
                <h3>Recommended actions</h3>
              </div>
              <button
                className={`${styles.primaryButton} ${styles.aiTriggerButton}`}
                type="button"
                onClick={loadRecommendations}
                disabled={loadingRecommendations}
              >
                {loadingRecommendations ? "Building..." : "⚡ Generate AI Strategy"}
              </button>
            </div>
            {loadingRecommendations ? (
              <div className={styles.skeletonStack}>
                <div className={styles.skeletonLine}></div>
                <div className={styles.skeletonLine}></div>
                <div className={styles.skeletonLine}></div>
              </div>
            ) : !hasBuiltRecommendations ? (
              <p className={styles.commandBody}>Generate Gemini guidance for the active response plan.</p>
            ) : (
              <ul className={styles.summaryList}>
                {recommendationItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.commandPanel}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.cardEyebrow}>Dispatch feed</p>
                <h3>Real-time activity</h3>
              </div>
              <span className={`${styles.commandStatusChip} ${riskChipClass}`}>{riskLevel}</span>
            </div>
            <ul className={styles.dispatchFeed}>
              {dispatchFeed.map((item) => (
                <li key={item.label} className={`${styles.dispatchItem} ${styles[`dispatch${item.state.charAt(0).toUpperCase() + item.state.slice(1)}`]}`}>
                  <span className={styles.dispatchDot}></span>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{latestIncident ? latestIncident.status.replace(/_/g, " ") : "Standby"}</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className={styles.commandBody}>{spread}</p>
          </div>
        </div>
      </div>
    </section>
  );
}