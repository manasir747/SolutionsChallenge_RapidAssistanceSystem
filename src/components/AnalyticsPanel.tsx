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
    </div>
  );
}
