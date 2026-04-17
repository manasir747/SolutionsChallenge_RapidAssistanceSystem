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
        <small>Active</small>
        <h2>{active}</h2>
      </div>
      <div className={styles.analyticsCard}>
        <small>Resolved (24h)</small>
        <h2>{resolved}</h2>
      </div>
      <div className={styles.analyticsCard}>
        <small>Avg Response (min)</small>
        <h2>{medianResponse}</h2>
      </div>
      <div className={styles.analyticsCard}>
        <small>Source mix</small>
        <h2>{Object.keys(sourceBreakdown).length}</h2>
        <p style={{ margin: "0.5rem 0 0", color: "rgba(255,255,255,0.7)" }}>
          {Object.entries(sourceBreakdown)
            .map(([source, count]) => `${source.toUpperCase()} ${count}`)
            .join(" • ") || "No incidents yet"}
        </p>
      </div>
    </div>
  );
}
