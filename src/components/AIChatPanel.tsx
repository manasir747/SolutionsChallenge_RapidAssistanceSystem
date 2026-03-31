"use client";

import { FormEvent, useState } from "react";
import styles from "@/styles/dashboard.module.css";
import { UserRole } from "@/types";

interface AIChatPanelProps {
  role: UserRole;
}

export default function AIChatPanel({ role }: AIChatPanelProps) {
  const [prompt, setPrompt] = useState("What should I do next?");
  const [answer, setAnswer] = useState<{ id: number; text: string }>({
    id: 0,
    text: "Use the AI assistant to stay informed."
  });
  const [loading, setLoading] = useState(false);

  const quickPrompts = [
    "Where is the nearest safe exit?",
    "How do I assist injured guests?",
    "What should I monitor while I wait?"
  ];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setAnswer((prev) => ({ id: prev.id + 1, text: "Thinking..." }));

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, role })
      });
      const data = await res.json();
      setAnswer((prev) => ({ id: prev.id + 1, text: data.answer ?? "AI could not respond." }));
    } catch (err) {
      const fallback = err instanceof Error ? err.message : "Gemini unavailable";
      setAnswer((prev) => ({ id: prev.id + 1, text: fallback }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.card} ${styles.chatPanel}`}>
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardEyebrow}>AI companion</p>
          <h3>Ask Gemini</h3>
        </div>
      </div>
      <div className={styles.quickPrompts}>
        {quickPrompts.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className={styles.quickPromptButton}
            onClick={() => setPrompt(suggestion)}
            aria-label={`Use suggestion: ${suggestion}`}
          >
            {suggestion}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className={styles.chatForm}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your situation"
          autoComplete="off"
        />
        <button className={styles.primaryButton} disabled={loading}>
          {loading ? "Sending" : "Ask"}
        </button>
      </form>
      <div className={styles.chatMessages} aria-live="polite">
        <div key={answer.id} className={styles.chatBubble}>
          {answer.text}
        </div>
        {loading && (
          <div className={styles.typingIndicator} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
    </div>
  );
}
