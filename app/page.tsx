"use client";

import { useState, useEffect } from "react";
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
import Footer from "@/components/shared/Footer";
import styles from "@/styles/landing.module.css";

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
    sparkline: "M0 35 C 15 35, 15 15, 30 15 C 45 15, 45 30, 60 30 C 75 30, 75 10, 90 10 C 105 10, 105 25, 120 25"
  },
  {
    title: "Response Units",
    value: "12 Units",
    trend: "Stable",
    icon: <Users />,
    badge: "Staff",
    badgeClass: styles.badgeMedical,
    sparkline: "M0 25 C 20 25, 20 10, 40 10 C 60 10, 60 30, 80 30 C 100 30, 100 15, 120 15"
  },
  {
    title: "Avg. Triage",
    value: "142s",
    trend: "-12s",
    icon: <HeartPulse />,
    badge: "Medical",
    badgeClass: styles.badgeMedical,
    sparkline: "M0 15 C 20 15, 20 35, 40 35 C 60 35, 60 10, 80 10 C 100 10, 100 20, 120 20"
  },
  {
    title: "Secure Zones",
    value: "98.2%",
    trend: "+2.1%",
    icon: <Lock />,
    badge: "Security",
    badgeClass: styles.badgeSecurity,
    sparkline: "M0 20 C 30 20, 30 5, 60 5 C 90 5, 90 25, 120 25"
  },
];

export default function HomePage() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20; 
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <main className={styles.heroShell} suppressHydrationWarning>
      <div className={styles.heroBackground}></div>

      <Navbar />

      <section className={styles.heroSection}>
        <div className={styles.heroContent}>

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

        </div>

        <div className={styles.heroVisual}>
          <div className={styles.dashboardAnchor}>
            {/* Floating Stats */}
            <div 
              className={`${styles.floatingStat} ${styles.stat1}`}
              style={{ "--mouse-x": `${mousePos.x}px`, "--mouse-y": `${mousePos.y}px` } as React.CSSProperties}
            >
              <div className={styles.statLabel}>Active Threat</div>
              <div className={styles.statValue}>
                Fire • North Tower
                <span className={styles.trendUp}>Critical</span>
              </div>
            </div>

            <div 
              className={`${styles.floatingStat} ${styles.stat2}`}
              style={{ "--mouse-x": `${mousePos.x * -1}px`, "--mouse-y": `${mousePos.y * -1}px` } as React.CSSProperties}
            >
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
                <div className={styles.mapPing} style={{ top: '60%', left: '70%', background: '#ffffff', boxShadow: '0 0 20px rgba(255, 255, 255, 0.3)' }}>
                  <div className={styles.pingPulse} style={{ borderColor: '#ffffff' }} />
                </div>

                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                  <path
                    d="M100 150 L250 180 L350 100"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    opacity="0.3"
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
              <svg className={styles.sparkline} viewBox="0 0 120 40">
                <path
                  className={styles.sparklinePath}
                  d={s.sparkline}
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
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
            &quot;Rapid Assistance transformed our emergency response protocols. We reduced our incident triage time by nearly 40% in the first quarter.&quot;
          </p>
          <div className={styles.testimonialAuthor}>Director of Security, Grand Horizon Resorts</div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
