"use client";

import Link from "next/link";
import { 
  Shield, 
  Zap, 
  Globe, 
  ChevronRight, 
  Activity, 
  MapPin, 
  Users, 
  Flame, 
  HeartPulse, 
  Lock,
  ArrowUpRight,
  Play
} from "lucide-react";
import Navbar from "@/components/shared/Navbar";
import styles from "@/styles/landing.module.css";

const trustIndicators = [
  { value: "500+", label: "Hotels Globally" },
  { value: "99.99%", label: "System Uptime" },
  { value: "37%", label: "Faster Response" },
];

const features = [
  { icon: <Activity className={styles.bulletIcon} />, text: "Real-time incident tracking & telemetry" },
  { icon: <Shield className={styles.bulletIcon} />, text: "AI-guided decision playbooks (Gemini)" },
  { icon: <MapPin className={styles.bulletIcon} />, text: "Integrated Google Maps team routing" },
];

const stats = [
  { 
    title: "Incident Load", 
    value: "5 Active", 
    trend: "+20%", 
    icon: <Flame />, 
    badge: "Fire", 
    badgeClass: styles.badgeFire,
    sparkline: "M0 30 Q10 10 20 25 T40 5 T60 20 T80 10 T100 25"
  },
  { 
    title: "Response Units", 
    value: "12 Units", 
    trend: "Stable", 
    icon: <Users />, 
    badge: "Staff", 
    badgeClass: styles.badgeMedical,
    sparkline: "M0 25 Q15 25 30 10 T60 20 T90 5 T120 15"
  },
  { 
    title: "Avg. Triage", 
    value: "142s", 
    trend: "-12s", 
    icon: <HeartPulse />, 
    badge: "Medical", 
    badgeClass: styles.badgeMedical,
    sparkline: "M0 10 Q20 30 40 10 T80 20 T120 5"
  },
  { 
    title: "Secure Zones", 
    value: "98.2%", 
    trend: "+2.1%", 
    icon: <Lock />, 
    badge: "Security", 
    badgeClass: styles.badgeSecurity,
    sparkline: "M0 20 Q20 5 40 20 T80 10 T120 15"
  },
];

export default function HomePage() {
  return (
    <main className={styles.heroShell} suppressHydrationWarning>
      {/* Animated Background */}
      <div className={styles.meshGradient}>
        <div className={`${styles.meshCircle} ${styles.mesh1}`} />
        <div className={`${styles.meshCircle} ${styles.mesh2}`} />
        <div className={`${styles.meshCircle} ${styles.mesh3}`} />
      </div>

      <Navbar />

      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.statusBadge}>
            <div className={styles.statusDot} />
            Real-time • AI-Powered • Mission Critical
          </div>
          <h1 className={styles.heroTitle}>
            Rapid Crisis Response for Hotels & Resorts
          </h1>
          <p className={styles.heroDescription}>
            Coordinate guests, staff, and emergency command with live intelligence, 
            Gemini-powered playbooks, and precision routing in one streamlined control plane.
          </p>

          <div className={styles.featureBullets}>
            {features.map((f, i) => (
              <div key={i} className={styles.bulletItem}>
                {f.icon}
                <span>{f.text}</span>
              </div>
            ))}
          </div>

          <div className={styles.actions}>
            <Link href="/login" className={styles.ctaPrimary}>
              Access Control Room
            </Link>
            <Link href="/dashboard" className={styles.ctaGhost}>
              <Play size={18} className={styles.playIcon} />
              View Live Demo
            </Link>
          </div>

          <div className={styles.trustSignals}>
            {trustIndicators.map((t, i) => (
              <div key={i} className={styles.trustItem}>
                <strong>{t.value}</strong>
                <span>{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.dashboardAnchor}>
            {/* Floating Stats */}
            <div className={`${styles.floatingStat} ${styles.stat1}`}>
              <div className={styles.statLabel}>Active Threat</div>
              <div className={styles.statValue}>
                Fire • North Tower
                <span className={styles.trendUp}>Critical</span>
              </div>
            </div>
            
            <div className={`${styles.floatingStat} ${styles.stat2}`}>
              <div className={styles.statLabel}>AI Recommended Route</div>
              <div className={styles.statValue}>
                Service Corridor A
                <ArrowUpRight size={16} className={styles.trendUp} />
              </div>
            </div>

            {/* Main Control Card */}
            <div className={styles.mainCard}>
              <div className={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className={styles.brandDot} style={{ width: '8px', height: '8px' }} />
                  <span className={styles.commandLabel}>
                    DOWNTOWN RESORT COMMAND
                  </span>
                </div>
                <div className={styles.windowButtons}>
                  <div className={`${styles.winBtn} ${styles.winBtnClose}`} />
                  <div className={`${styles.winBtn} ${styles.winBtnMin}`} />
                  <div className={`${styles.winBtn} ${styles.winBtnMax}`} />
                </div>
              </div>

              <div className={styles.mapContainer}>
                <div className={styles.mapOverlay} />
                {/* Pulse Points */}
                <div className={styles.mapPing} style={{ top: '30%', left: '40%' }}>
                  <div className={styles.pingPulse} />
                </div>
                <div className={styles.mapPing} style={{ top: '60%', left: '70%', background: '#5de0e6', boxShadow: '0 0 20px #5de0e6' }}>
                  <div className={styles.pingPulse} style={{ borderColor: '#5de0e6' }} />
                </div>

                {/* Animated Route Line */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                  <path 
                    d="M100 150 L250 180 L350 100" 
                    fill="none" 
                    stroke="#5de0e6" 
                    strokeWidth="2" 
                    strokeDasharray="5,5"
                    opacity="0.5"
                  />
                </svg>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div className={styles.statLabel}>Gemini Insight</div>
                  <div className={styles.insightText}>
                    Priority evacuation via Service Corridor A. ETA for First Responders: 2m 40s.
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={styles.statLabel}>Response Timer</div>
                  <div className={styles.timerValue}>02:41</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.metricsSection}>
        <div className={styles.metricsGrid}>
          {stats.map((s, i) => (
            <div key={i} className={styles.metricCard}>
              <div className={styles.metricTop}>
                <div className={styles.metricIcon}>{s.icon}</div>
                <div className={`${styles.metricBadge} ${s.badgeClass}`}>
                  {s.badge}
                </div>
              </div>
              <div className={styles.statLabel}>{s.title}</div>
              <div className={styles.statValue}>
                {s.value}
                <span className={s.trend.startsWith('+') ? styles.trendUp : styles.statLabel} style={{ fontSize: '0.75rem', marginLeft: 'auto' }}>
                  {s.trend}
                </span>
              </div>
              <svg className={styles.sparkline} viewBox="0 0 100 40">
                <path 
                  d={s.sparkline} 
                  fill="none" 
                  stroke={s.badgeClass.includes('Fire') ? '#ff5f6d' : s.badgeClass.includes('Medical') ? '#5de0e6' : '#ffc857'} 
                  strokeWidth="2" 
                />
              </svg>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial Snippet */}
      <div className={styles.testimonialWrapper}>
        <div className={styles.testimonialCard}>
          <p className={styles.testimonialText}>
            "Rapid Assistance transformed our emergency response protocols. We reduced our incident triage time by nearly 40% in the first quarter."
          </p>
          <div className={styles.testimonialAuthor}>Director of Security, Grand Horizon Resorts</div>
        </div>
      </div>
    </main>
  );
}
