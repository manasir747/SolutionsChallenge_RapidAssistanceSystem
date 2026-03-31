"use client";

import { FormEvent, useState } from "react";
import styles from "@/styles/dashboard.module.css";
import { ChatMessage, Incident } from "@/types";

interface ConversationPanelProps {
  incident?: Incident;
  messages: ChatMessage[];
  onSend: (text: string) => Promise<void>;
}

export default function ConversationPanel({ incident, messages, onSend }: ConversationPanelProps) {
  const [draft, setDraft] = useState("Heading to stairwell C now.");
  const [loading, setLoading] = useState(false);

  if (!incident) {
    return (
      <div className={styles.card}>
        <p>Select an incident to start chatting.</p>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setLoading(true);
    await onSend(draft.trim());
    setDraft("");
    setLoading(false);
  };

  return (
    <div className={`${styles.card} ${styles.chatPanel}`}>
      <div className={styles.cardHeader}>
        <div>
          <h3>Incident Chat</h3>
          <small>{incident.type.toUpperCase()}</small>
        </div>
      </div>
      <div className={styles.chatMessages}>
        {messages.map((message) => (
          <div key={message.id} className={styles.chatBubble}>
            <strong>{message.authorRole.toUpperCase()}</strong>
            <p>{message.message}</p>
            <small>{new Date(message.createdAt).toLocaleTimeString()}</small>
          </div>
        ))}
        {messages.length === 0 && <p>No messages yet.</p>}
      </div>
      <form className={styles.chatForm} onSubmit={handleSubmit}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Send update" />
        <button className={styles.primaryButton} disabled={loading}>
          {loading ? "Sending" : "Send"}
        </button>
      </form>
    </div>
  );
}
