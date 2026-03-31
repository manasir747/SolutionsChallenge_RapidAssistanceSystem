"use client";

import { useEffect, useState } from "react";
import styles from "@/styles/dashboard.module.css";
import { SuggestionCard } from "@/types";

export default function SuggestionPanel() {
  const [suggestions, setSuggestions] = useState<SuggestionCard[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = async () => {
    setLoading(true);
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

  useEffect(() => {
    fetchSuggestions();
  }, []);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3>Gemini Suggestions</h3>
        <button className={styles.secondaryButton} onClick={fetchSuggestions} disabled={loading}>
          Refresh
        </button>
      </div>
      <div className={styles.incidentList}>
        {suggestions.map((suggestion) => (
          <article key={suggestion.id} className={styles.incidentItem}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{suggestion.title}</strong>
              <span>{suggestion.severity.toUpperCase()}</span>
            </div>
            <p>{suggestion.detail}</p>
          </article>
        ))}
        {suggestions.length === 0 && <p>No suggestions yet.</p>}
      </div>
    </div>
  );
}
