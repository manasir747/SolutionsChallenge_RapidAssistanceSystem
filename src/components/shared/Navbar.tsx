"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import styles from "@/styles/navbar.module.css";

const navLinks = [
  { name: "Product", href: "#product" },
  { name: "Features", href: "#features" },
  { name: "Pricing", href: "#pricing" },
  { name: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`${styles.navbarShell} ${scrolled ? styles.navbarScrolled : ""}`} suppressHydrationWarning>
      <div className={styles.navbarContainer}>
        {/* Left: Logo */}
        <Link href="/" className={styles.brand}>
          <div className={styles.logoWrapper}>
            <div className={styles.logoOrb} />
            <div className={styles.liveIndicator} />
          </div>
          <span className={styles.brandText}>Rapid Assistance</span>
        </Link>

        {/* Center: Desktop Links */}
        <div className={styles.navLinks}>
          {navLinks.map((link) => (
            <Link key={link.name} href={link.href} className={styles.navItem}>
              {link.name}
            </Link>
          ))}
        </div>

        {/* Right: Actions */}
        <div className={styles.actions}>
          <Link href="/login" className={styles.loginBtn}>
            Login
          </Link>
          <Link href="/login" className={styles.ctaBtn}>
            <div className={styles.shimmer} />
            Access Control Room
          </Link>
          
          <button 
            className={styles.mobileToggle} 
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open Menu"
          >
            <Menu size={28} />
          </button>
        </div>

        {/* Bottom Glow Line */}
        <div className={styles.bottomBorder} />
      </div>

      {/* Mobile Fullscreen Menu */}
      <div className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.mobileMenuOpen : ""}`}>
        <button 
          className={styles.mobileToggle} 
          style={{ position: 'absolute', top: '2rem', right: '5%' }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <X size={32} />
        </button>
        {navLinks.map((link) => (
          <Link 
            key={link.name} 
            href={link.href} 
            className={styles.mobileLink}
            onClick={() => setMobileMenuOpen(false)}
          >
            {link.name}
          </Link>
        ))}
        <Link 
          href="/login" 
          className={styles.ctaBtn} 
          style={{ marginTop: '2rem' }}
          onClick={() => setMobileMenuOpen(false)}
        >
          Access Control Room
        </Link>
      </div>
    </nav>
  );
}
