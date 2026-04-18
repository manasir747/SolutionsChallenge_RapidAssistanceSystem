"use client";

import { useState } from "react";
import styles from "@/styles/dashboard.module.css";
import { SuggestionCard } from "@/types";

export default function SuggestionPanel() {
  const [suggestions, setSuggestions] = useState<SuggestionCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [hasBuilt, setHasBuilt] = useState(false);

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
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3>Gemini Suggestions</h3>
        <button className={styles.secondaryButton} onClick={fetchSuggestions} disabled={loading}>
          {hasBuilt ? "Rebuild Suggestions" : "Build Suggestions"}
        </button>
      </div>
      <div className={styles.suggestionList}>
        {!hasBuilt && <p>Click Build Suggestions to generate Gemini recommendations.</p>}
        {hasBuilt && suggestions.length === 0 && !loading && <p>No suggestions yet.</p>}
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
