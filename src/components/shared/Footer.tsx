import Link from "next/link";
import styles from "@/styles/footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footerShell}>
      <div className={styles.footerCard}>
        <div className={styles.topSection}>
          <div className={styles.infoBlock}>
            <p>
              Mission Critical Crisis Response System. Intentional technical development and interactive telemetry.
              <br />
              High-performance digital experiences built for Hotels & Resorts.
            </p>
            <div className={styles.partnerBadge}>
              <div className={styles.logoOrb} />
              <span>Certified Partner</span>
            </div>
          </div>
          <div className={styles.actionBlock}>
            <Link href="/login" className={styles.bookBtn}>
              BOOK A DEMO
            </Link>
          </div>
        </div>

        <div className={styles.hugeTextWrapper}>
          <span className={styles.hugeText}>rapidassistance.system</span>
        </div>

        <div className={styles.bottomSection}>
          <span className={styles.copyright}>&copy; 2026</span>
          <span className={styles.rights}>All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
