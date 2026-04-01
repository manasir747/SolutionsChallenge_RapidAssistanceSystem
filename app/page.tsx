import Link from "next/link";
import styles from "@/styles/landing.module.css";

const trustSignals = [
  { icon: "⚡", label: "< 4 min response time" },
  { icon: "🛡️", label: "AI-guided decisions" },
  { icon: "🌍", label: "Multi-location ready" },
];

const visualInsights = [
  { title: "Incident Load", value: "5 Active", meta: "Medical · Fire · Security" },
  { title: "Teams Dispatched", value: "12 Units", meta: "Staff · EMT · Security" },
];

const capabilityHighlights = [
  {
    title: "Live Emergencies",
    description: "Fire, medical, and security incidents surface with severity indicators and auto-routing.",
  },
  {
    title: "AI Guidance",
    description: "Gemini-generated playbooks keep decision makers two steps ahead of unfolding events.",
  },
  {
    title: "Mapped Teams",
    description: "Track responders, guests, and nearest exits with location-linked tasking.",
  },
];

export default function HomePage() {
  return (
    <main className={styles.heroShell}>
      <div className={styles.glowBackdrop} aria-hidden />

      <header className={styles.navbar}>
        <div className={styles.brandMark}>
          <span className={styles.brandDot} />
          Rapid Assistance
        </div>
        <Link href="/login" className={styles.loginLink}>
          Login
        </Link>
      </header>

      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <span className={styles.status}>Realtime • AI-guided • Secure</span>
          <h1 className={styles.heroTitle}>Rapid Crisis Response for Hotels & Resorts</h1>
          <p className={styles.heroDescription}>
            Coordinate guests, staff, and command with live incident tracking, Gemini-powered intelligence,
            and Google Maps routing in one streamlined control plane.
          </p>

          <div className={styles.actions}>
            <Link href="/login" className={styles.ctaPrimary}>
              Access Control Room
            </Link>
            <Link href="/dashboard" className={styles.ctaGhost}>
              View Demo Dashboard
            </Link>
          </div>

          <div className={styles.trustRow}>
            {trustSignals.map((stat) => (
              <div key={stat.label} className={styles.trustStat}>
                <span>{stat.icon}</span>
                <p>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.heroVisual}>
          <article className={styles.mapPreview}>
            <div className={styles.mapHeader}>
              <span>Downtown Resort</span>
              <span className={styles.livePill}>Live</span>
            </div>
            <div className={styles.mapCanvas}>
              <span className={`${styles.mapPing} ${styles.mapPingPrimary}`} />
              <span className={`${styles.mapPing} ${styles.mapPingSecondary}`} />
              <span className={`${styles.mapPing} ${styles.mapPingTertiary}`} />
              <div className={styles.routeBadge}>
                Route recalculated
                <small>North tower → Atrium</small>
              </div>
            </div>
            <div className={styles.mapFooter}>
              <p>Gemini prioritizes evacuation path via service corridor.</p>
              <span>ETA 02:41</span>
            </div>
          </article>

          <div className={styles.visualStack}>
            {visualInsights.map((insight) => (
              <article key={insight.title} className={styles.visualCard}>
                <p>{insight.title}</p>
                <strong>{insight.value}</strong>
                <span>{insight.meta}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.previewSection}>
        <div className={styles.sectionHeading}>
          <span>Operational intelligence</span>
          <h2>Unified situational awareness without the noise.</h2>
          <p>
            Role-based workspaces keep guests, staff, and command aligned while Gemini surfaces next-best
            actions and Google Maps keeps responders synced.
          </p>
        </div>

        <div className={styles.previewGrid}>
          {capabilityHighlights.map((card) => (
            <article key={card.title} className={styles.previewCard}>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
