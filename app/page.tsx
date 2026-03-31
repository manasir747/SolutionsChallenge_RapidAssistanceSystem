import Link from "next/link";
import styles from "@/styles/landing.module.css";

export default function HomePage() {
  return (
    <main className={styles.heroShell}>
      <section className={styles.heroCard}>
        <span className={styles.status}>Realtime • AI-guided • Secure</span>
        <h1>Rapid Crisis Response for Hotels & Resorts</h1>
        <p>
          Coordinate guests, staff, and command with live incident tracking, Gemini-powered
          intelligence, and Google Maps routing in one streamlined control plane.
        </p>
        <div className={styles.actions}>
          <Link href="/login" className={styles.ctaPrimary}>
            Access Control Room
          </Link>
          <Link href="/dashboard" className={styles.ctaGhost}>
            View Demo Dashboard
          </Link>
        </div>
      </section>
      <section className={styles.previewGrid}>
        <div>
          <strong>Live Emergencies</strong>
          <p>Fire • Medical • Security</p>
        </div>
        <div>
          <strong>AI Guidance</strong>
          <p>Gemini action cards keep admins ahead of unfolding events.</p>
        </div>
        <div>
          <strong>Mapped Teams</strong>
          <p>Track responders, guests, and nearest exits in real time.</p>
        </div>
      </section>
    </main>
  );
}
