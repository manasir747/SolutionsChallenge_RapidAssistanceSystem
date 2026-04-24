"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Mic } from "lucide-react";
import styles from "@/styles/guest-dashboard.module.css";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function EmergencyAiAssistant() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "I am your Emergency AI. How can I assist you in this situation?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, role: "guest" })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.answer || "I apologize, I am having trouble connecting to the command center." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Error: Connection lost. Please follow manual evacuation signs." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={styles.aiAssistantInner}>
      <div className={styles.chatDisplay} ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`${styles.chatBubble} ${msg.role === 'user' ? styles.userBubble : styles.assistantBubble}`}
          >
            {msg.role === 'assistant' && <Sparkles size={14} className={styles.bubbleIcon} />}
            <div className={styles.bubbleText}>{msg.content}</div>
          </div>
        ))}
        {isTyping && (
          <div className={styles.typingIndicator}>
            <span></span><span></span><span></span>
          </div>
        )}
      </div>

      <div className={styles.quickChips}>
        {["Exit path", "First aid", "Security"].map(chip => (
          <button 
            key={chip} 
            className={styles.actionChip} 
            onClick={() => handleSend(`Guide me on: ${chip}`)}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className={styles.chatInputWrapper}>
        <input 
          className={styles.chatInput}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
          placeholder="Ask AI anything..."
        />
        <button className={styles.sendBtn} onClick={() => handleSend(input)}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
