import styles from "@/styles/dashboard.module.css";
import { Incident } from "@/types";

interface AnalyticsPanelProps {
  incidents: Incident[];
}

const calcAverageResponse = (incidents: Incident[]) => {
  if (!incidents.length) return 0;
  const total = incidents.reduce((sum, incident) => sum + (incident.priority === "high" ? 6 : 12), 0);
  return Math.round(total / incidents.length);
};

export default function AnalyticsPanel({ incidents }: AnalyticsPanelProps) {
  const resolved = incidents.filter((incident) => incident.status === "resolved").length;
  const active = incidents.length - resolved;
  const medianResponse = calcAverageResponse(incidents);
  const sourceBreakdown = incidents.reduce<Record<string, number>>((accumulator, incident) => {
    accumulator[incident.source] = (accumulator[incident.source] ?? 0) + 1;
    return accumulator;
  }, {});

  return (
    <div className={`${styles.card} ${styles.analyticsGrid}`}>
      <div className={styles.analyticsCard}>
        <div className={styles.analyticsHeader}>
          <small>Active</small>
          <span className={styles.sparkline} aria-hidden="true"></span>
        </div>
        <h2 className={styles.analyticsValue}>{active}</h2>
        <span className={styles.analyticsTag}>Live</span>
      </div>
      <div className={styles.analyticsCard}>
        <div className={styles.analyticsHeader}>
          <small>Resolved (24h)</small>
          <span className={styles.sparkline} aria-hidden="true"></span>
        </div>
        <h2 className={styles.analyticsValue}>{resolved}</h2>
        <span className={styles.analyticsTag}>Confirmed</span>
      </div>
      <div className={styles.analyticsCard}>
        <div className={styles.analyticsHeader}>
          <small>Avg Response (min)</small>
          <span className={styles.sparkline} aria-hidden="true"></span>
        </div>
        <h2 className={styles.analyticsValue}>{medianResponse}</h2>
        <span className={styles.analyticsTag}>Rolling</span>
      </div>
      <div className={styles.analyticsCard}>
        <div className={styles.analyticsHeader}>
          <small>Source mix</small>
          <span className={styles.sparkline} aria-hidden="true"></span>
        </div>
        <h2 className={styles.analyticsValue}>{Object.keys(sourceBreakdown).length}</h2>
        <span className={styles.analyticsTag}>Signals</span>
        <p style={{ margin: "0.5rem 0 0", color: "rgba(255,255,255,0.7)" }}>
          {Object.entries(sourceBreakdown)
            .map(([source, count]) => `${source.toUpperCase()} ${count}`)
            .join(" • ") || "No incidents yet"}
        </p>
      </div>
    </div>
  );
}
