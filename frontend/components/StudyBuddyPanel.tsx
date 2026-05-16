"use client";

import { useEffect, useRef, useState } from "react";
import MathText from "@/components/MathText";
import { chatWithStudyBuddy, ChatMessage } from "@/lib/api";

interface Props {
  userId: string;
  questionContext?: string; // injected from the current question text
  onClose: () => void;
}

export default function StudyBuddyPanel({ userId, questionContext, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm StudyBuddy 👋 I can help you with **Ubahan**, **Matriks**, and **Insurans**. Ask me anything about this question or these topics!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };

    // Build history to send: if first real user message, prepend question context
    let historyToSend: ChatMessage[];
    const isFirstUserMessage = !messages.some((m) => m.role === "user");
    if (isFirstUserMessage && questionContext) {
      historyToSend = [
        ...messages,
        {
          role: "user",
          content: `[Current question for context: ${questionContext}]\n\n${text}`,
        },
      ];
    } else {
      historyToSend = [...messages, userMsg];
    }

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await chatWithStudyBuddy(userId, historyToSend);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't reach the server. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Send on Enter (not Shift+Enter)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Auto-grow textarea
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }

  return (
    <div className="sb-panel card page-enter">
      {/* Header */}
      <div className="sb-header">
        <div className="sb-header-left">
          <span className="sb-avatar">🤖</span>
          <div>
            <div className="sb-title">StudyBuddy</div>
            <div className="sb-subtitle">Ubahan · Matriks · Insurans</div>
          </div>
        </div>
        <button
          type="button"
          className="sb-close"
          onClick={onClose}
          aria-label="Close StudyBuddy"
        >
          ✕
        </button>
      </div>

      {/* Message list */}
      <div className="sb-messages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`sb-bubble ${msg.role === "user" ? "sb-bubble-user" : "sb-bubble-bot"}`}
          >
            {msg.role === "user" ? (
              <span className="sb-bubble-text">{msg.content}</span>
            ) : (
              <MathText className="sb-md">{msg.content}</MathText>
            )}
          </div>
        ))}

        {loading && (
          <div className="sb-bubble sb-bubble-bot">
            <span className="sb-typing">
              <span />
              <span />
              <span />
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="sb-input-row">
        <textarea
          ref={inputRef}
          className="sb-input"
          rows={1}
          placeholder="Ask about Ubahan, Matriks, or Insurans…"
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          type="button"
          className="sb-send"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          aria-label="Send"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
