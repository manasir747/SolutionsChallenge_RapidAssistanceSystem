"use client";

import { FormEvent, useState } from "react";
import styles from "@/styles/dashboard.module.css";
import { UserRole } from "@/types";

interface AIChatPanelProps {
  role: UserRole;
}

interface AssistantEntry {
  id: number;
  prompt: string;
  steps: string[];
  timestamp: string;
}

const QUICK_ACTIONS = [
  { label: "Guide me to exit", prompt: "Guide me to the nearest safe exit with clear turn-by-turn directions." },
  { label: "First aid steps", prompt: "Give first aid instructions for helping an injured hotel guest in an emergency." },
  { label: "What should I do now?", prompt: "List the immediate actions I should take while waiting for responders." }
];

const formatResponse = (text: string) => {
  const normalized = text.replace(/•/g, "\n").replace(/- /g, "\n");
  const parts = normalized
    .split(/\n|\. /)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [text];
};

export default function AIChatPanel({ role }: AIChatPanelProps) {
  const [prompt, setPrompt] = useState("What should I do next?");
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState<AssistantEntry[]>([
    {
      id: 0,
      prompt: "System",
      steps: ["Use the AI assistant to stay informed."],
      timestamp: new Date().toISOString()
    }
  ]);

  const dispatchPrompt = async (question: string) => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: question.trim(), role })
      });
      const data = await res.json();
      const answerText = data.answer ?? "AI could not respond.";
      setResponses((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          prompt: question,
          steps: formatResponse(answerText),
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (err) {
      const fallback = err instanceof Error ? err.message : "Gemini unavailable";
      setResponses((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          prompt: question,
          steps: [fallback],
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await dispatchPrompt(prompt);
    setPrompt("");
  };

  const handleQuickAction = async (actionPrompt: string) => {
    setPrompt(actionPrompt);
    await dispatchPrompt(actionPrompt);
  };

  return (
    <div className={`${styles.card} ${styles.chatPanel}`}>
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardEyebrow}>AI guide</p>
          <h3>Operational assistant</h3>
        </div>
      </div>
      <div className={styles.quickPrompts}>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            className={styles.quickPromptButton}
            onClick={() => handleQuickAction(action.prompt)}
            aria-label={action.label}
            disabled={loading}
          >
            {action.label}
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
      <div className={styles.assistantOutput} aria-live="polite">
        {responses.slice(-3).map((entry) => (
          <div key={entry.id} className={styles.assistantBubble}>
            <div className={styles.assistantPrompt}>
              <span>{entry.id === 0 ? "System" : "Action plan"}</span>
              <time>{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            </div>
            <ul>
              {entry.steps.map((step, index) => (
                <li key={`${entry.id}-${index}`}>{step}</li>
              ))}
            </ul>
          </div>
        ))}
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
