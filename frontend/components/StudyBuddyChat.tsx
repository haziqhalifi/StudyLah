"use client";

import { useEffect, useRef, useState } from "react";
import MathText from "@/components/MathText";
import QuickActionChips from "@/components/QuickActionChips";
import QuizDrawer from "@/components/QuizDrawer";
import { postStudyBuddyMessage, ChatMessage } from "@/lib/api";
import { LearningContext, QuickAction } from "@/lib/types";
import {
  DEFAULT_QUICK_ACTIONS,
  getContextualQuickActions,
} from "@/lib/quickActions";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StudyBuddyChatProps {
  userId: string;
  learningContext?: LearningContext;
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TOPIC_DISPLAY: Record<string, string> = {
  ubahan: "Ubahan",
  matriks: "Matriks",
  insurans: "Insurans",
};

function buildWelcomeMessage(ctx?: LearningContext): string {
  if (ctx?.currentQuestion) {
    return (
      `Hi! I'm StudyBuddy 👋 I can see you're working on **${ctx.topicName}**` +
      (ctx.chapterName ? ` — ${ctx.chapterName}` : "") +
      ".\n\nUse the chips below to get instant help, or ask me anything! 🚀"
    );
  }
  return (
    "Hi! I'm StudyBuddy 👋 I can help you with **Ubahan**, **Matriks**, and **Insurans**.\n\n" +
    "Tap a chip below to get started, or ask me anything! 🚀"
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StudyBuddyChat({
  userId,
  learningContext,
  isOpen,
  onClose,
}: StudyBuddyChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { role: "assistant", content: buildWelcomeMessage(learningContext) },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  // "expanded" = chips visible above input; "collapsed" = chips hidden
  const [chipsVisible, setChipsVisible] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Decide which chip set to display
  const hasContext = !!(learningContext?.currentQuestion);
  const chips: QuickAction[] = hasContext
    ? getContextualQuickActions(
        learningContext!.topicId,
        learningContext!.currentQuestion!.text,
      )
    : DEFAULT_QUICK_ACTIONS;

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Re-generate welcome message if context changes (e.g. user moves to next Q)
  useEffect(() => {
    setMessages([
      { role: "assistant", content: buildWelcomeMessage(learningContext) },
    ]);
    setChipsVisible(true);
  }, [learningContext?.currentQuestion?.id]);

  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // Send logic
  // ---------------------------------------------------------------------------

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };

    // On the very first user message: if we have a plain questionContext
    // (legacy path), prepend it. With the new LearningContext the backend
    // handles personalisation, so we just send the raw message.
    const historyToSend: ChatMessage[] = [...messages, userMsg];

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setLoading(true);
    setChipsVisible(false); // hide chips while waiting for response

    try {
      const res = await postStudyBuddyMessage(
        userId,
        historyToSend,
        learningContext,
      );

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply },
      ]);

      // Re-show chips after every response so user can keep using quick actions
      setChipsVisible(true);

      if (res.action?.type === "create_quiz") {
        setTimeout(() => setActiveQuizId(res.action.type === "create_quiz" ? res.action.quiz_id : null), 800);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't reach the server. Please try again.",
        },
      ]);
      setChipsVisible(true);
    } finally {
      setLoading(false);
    }
  }

  function handleSend() {
    sendMessage(input.trim());
  }

  function handleChipSelect(action: QuickAction) {
    sendMessage(action.message);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const userHasSentMessage = messages.some((m) => m.role === "user");

  // Quiz drawer rendered on top of the chat — closing it returns to the chat
  if (activeQuizId) {
    return (
      <QuizDrawer
        quizId={activeQuizId}
        userId={userId}
        onClose={() => setActiveQuizId(null)}
      />
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="sb-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <div className="sb-panel" role="dialog" aria-label="StudyBuddy chat">
        {/* Drag handle */}
        <div className="sb-drag-handle" />

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

        {/* Context banner — only shown when a question is active */}
        {learningContext?.currentQuestion && (
          <div className="sb-context-banner">
            <span className="sb-context-icon">📚</span>
            <span className="sb-context-text">
              Helping with:{" "}
              <strong>
                {TOPIC_DISPLAY[learningContext.topicId] ?? learningContext.topicName}
              </strong>
              {learningContext.chapterName && (
                <> &rsaquo; {learningContext.chapterName}</>
              )}
            </span>
            {learningContext.lastAttempt && (
              <span
                className={`sb-context-attempt ${
                  learningContext.lastAttempt.isCorrect
                    ? "sb-context-correct"
                    : "sb-context-wrong"
                }`}
              >
                {learningContext.lastAttempt.isCorrect ? "✓ Correct" : "✗ Wrong"}
              </span>
            )}
          </div>
        )}

        {/* Message list */}
        <div className="sb-messages">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`sb-bubble ${
                msg.role === "user" ? "sb-bubble-user" : "sb-bubble-bot"
              }`}
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

        {/* Quick action chips */}
        {chipsVisible && (
          <div className="sb-chips-container">
            {userHasSentMessage && (
              <button
                type="button"
                className="sb-chips-toggle"
                onClick={() => setChipsVisible(false)}
                aria-label="Hide quick actions"
              >
                More actions ▲
              </button>
            )}
            <QuickActionChips
              actions={chips}
              onActionSelect={handleChipSelect}
              disabled={loading}
            />
          </div>
        )}

        {/* Collapsed chips toggle */}
        {!chipsVisible && !loading && userHasSentMessage && (
          <button
            type="button"
            className="sb-chips-show-btn"
            onClick={() => setChipsVisible(true)}
            aria-label="Show quick actions"
          >
            ⚡ Quick actions
          </button>
        )}

        {/* Input row */}
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
    </>
  );
}
