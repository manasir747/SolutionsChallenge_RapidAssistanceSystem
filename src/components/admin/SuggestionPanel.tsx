"use client";

import { useState, useMemo } from "react";
import { Sparkles, Zap, ShieldCheck, Activity } from "lucide-react";
import styles from "@/styles/dashboard.module.css";
import { SuggestionCard } from "@/types";

interface SuggestionPanelProps {
  activeScenario?: string | null;
  severity?: "low" | "medium" | "critical";
}

export default function AICommandAssistant({ activeScenario, severity }: SuggestionPanelProps) {
  const [suggestions, setSuggestions] = useState<SuggestionCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [hasBuilt, setHasBuilt] = useState(false);
  const [autoApply, setAutoApply] = useState(false);

  const scenarioInsights = useMemo(() => {
    if (!activeScenario) return null;
    const insights: Record<string, any> = {
      fire: {
        spread: "High via corridor ventilation",
        alerts: "Evacuation + Fire Dept",
        gap: "12% response delay predicted"
      },
      medical: {
        spread: "Localized to incident zone",
        alerts: "EMS + On-site Medical",
        gap: "5m ETA for primary responder"
      },
      security: {
        spread: "Medium risk of escalation",
        alerts: "Police + Lockdown Protocol",
        gap: "Secure perimeter in <2m"
      },
      theft: {
        spread: "Low (Asset tracking active)",
        alerts: "Security + Staff Awareness",
        gap: "94% recovery probability"
      }
    };
    return insights[activeScenario] || null;
  }, [activeScenario]);

  const normalizeDetail = (value: string) =>
    value
      .replace(/\*\*/g, "")
      .replace(/#+\s*/g, "")
      .replace(/\s+\n/g, "\n")
      .trim();

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchSuggestions = async () => {
    setLoading(true);
    setHasBuilt(true);
    try {
      const res = await fetch("/api/ai/suggestions", { method: "POST" });
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.card} ${styles.aiCommandAssistant}`}>
      <div className={styles.cardHeader}>
        <div className={styles.aiTitleGroup}>
          <Sparkles size={20} color="#38bdf8" />
          <h3>AI Command Assistant</h3>
        </div>
        <div className={styles.aiHeaderActions}>
          <div className={styles.confidenceMeter}>
            <div className={styles.meterFill} style={{ width: '94%' }}></div>
            <span>94% Confidence</span>
          </div>
        </div>
      </div>

      {activeScenario && scenarioInsights && (
        <div className={styles.scenarioIntelligence}>
          <div className={styles.intelItem}>
            <Activity size={14} />
            <div>
              <span>Expected Spread</span>
              <strong>{scenarioInsights.spread}</strong>
            </div>
          </div>
          <div className={styles.intelItem}>
            <Zap size={14} />
            <div>
              <span>Recommended Alerts</span>
              <strong>{scenarioInsights.alerts}</strong>
            </div>
          </div>
          <div className={styles.intelItem}>
            <ShieldCheck size={14} />
            <div>
              <span>Response Gap</span>
              <strong>{scenarioInsights.gap}</strong>
            </div>
          </div>
          
          <div className={styles.autoApplyRow}>
            <label className={styles.toggleSwitch}>
              <input 
                type="checkbox" 
                checked={autoApply} 
                onChange={(e) => setAutoApply(e.target.checked)} 
              />
              <span className={styles.toggleSlider}></span>
            </label>
            <span>Auto-apply AI recommendations</span>
          </div>
        </div>
      )}

      <div className={styles.suggestionList}>
        {!hasBuilt && !activeScenario && (
          <div className={styles.aiEmptyState}>
            <p>Select a simulation scenario or click below for global intelligence.</p>
            <button className={styles.secondaryButton} onClick={fetchSuggestions} disabled={loading}>
              Build Global Recommendations
            </button>
          </div>
        )}
        
        {suggestions.map((suggestion) => (
          <article key={suggestion.id} className={styles.suggestionItem}>
            <div className={styles.suggestionHeader}>
              <strong className={styles.suggestionTitle}>{suggestion.title}</strong>
              <span
                className={`${styles.severityPill} ${styles[`severity${suggestion.severity.charAt(0).toUpperCase() + suggestion.severity.slice(1)}`]}`}
              >
                {suggestion.severity}
              </span>
            </div>
            <div className={expanded[suggestion.id] ? styles.detailExpanded : styles.detailClamp}>
              {normalizeDetail(suggestion.detail)
                .split(/\n+/)
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={`${suggestion.id}-${index}`} className={styles.detailText}>
                    {paragraph}
                  </p>
                ))}
            </div>
            <button className={styles.ghostButton} type="button" onClick={() => toggleExpanded(suggestion.id)}>
              {expanded[suggestion.id] ? "Show less" : "Show more"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
