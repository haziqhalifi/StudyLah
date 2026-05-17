"use client";

import { useEffect, useRef, useState } from "react";
import MathText from "@/components/MathText";
import QuickActionChips from "@/components/QuickActionChips";
import QuizDrawer from "@/components/QuizDrawer";
import { postStudyBuddyMessage, fetchCoachMessage, ChatMessage, AgentAction } from "@/lib/api";
import FlashcardReadyCard from "@/components/FlashcardReadyCard";
import QuizReadyCard from "@/components/QuizReadyCard";
import { LearningContext, QuickAction } from "@/lib/types";
import { getChipsForContext } from "@/lib/quickActions";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StudyBuddyChatProps {
  userId: string;
  learningContext?: LearningContext;
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Extends ChatMessage with optional flags:
//   isCoach  — style as AI Coach bubble
//   action   — attach an agent action to a bot bubble (e.g. create_flashcards)
type DisplayMessage = ChatMessage & { isCoach?: boolean; action?: AgentAction; pickFlashcardTopic?: boolean };

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
  initialMessage,
}: StudyBuddyChatProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>(() => [
    { role: "assistant", content: buildWelcomeMessage(learningContext) },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [chipsVisible, setChipsVisible] = useState(true);
  const sentInitial = useRef(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Chip set adapts to: no context → defaults, question+no attempt → hints,
  // wrong answer → explain-first, correct answer → momentum chips.
  const chips: QuickAction[] = getChipsForContext(learningContext);

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

  // Focus input when opened; auto-send initialMessage once
  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => inputRef.current?.focus(), 50);
    if (initialMessage && !sentInitial.current) {
      sentInitial.current = true;
      // Small delay so the drawer is fully rendered before sending
      setTimeout(() => sendMessage(initialMessage), 120);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Re-generate welcome message if context changes (e.g. user moves to next Q)
  useEffect(() => {
    sentInitial.current = false;
    setMessages([{ role: "assistant", content: buildWelcomeMessage(learningContext) }]);
    setChipsVisible(true);
  }, [learningContext?.currentQuestion?.id]);

  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // Send logic
  // ---------------------------------------------------------------------------

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: DisplayMessage = { role: "user", content: text };
    // Strip the isCoach flag before sending to the StudyBuddy endpoint.
    const historyToSend: ChatMessage[] = [...messages, userMsg].map(
      ({ role, content }) => ({ role, content }),
    );

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setLoading(true);
    setChipsVisible(false);

    try {
      const res = await postStudyBuddyMessage(userId, historyToSend, learningContext);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply,
          action: res.action?.type !== "none" ? res.action : undefined,
          pickFlashcardTopic: res.meta?.pick_flashcard_topic === true,
        },
      ]);
      setChipsVisible(true);

    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Maaf, ada ralat. Cuba lagi." },
      ]);
      setChipsVisible(true);
    } finally {
      setLoading(false);
    }
  }

  async function sendCoachMessage(text: string) {
    if (loading) return;

    const userMsg: DisplayMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setChipsVisible(false);

    try {
      const res = await fetchCoachMessage(
        userId,
        text,
        learningContext?.pageContext ?? "general",
        learningContext?.topicId,
      );
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply, isCoach: true },
      ]);
      setChipsVisible(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Maaf, ada ralat. Cuba lagi." },
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
    if (action.actionType === "ask_coach") {
      sendCoachMessage(action.message);
    } else {
      sendMessage(action.message);
    }
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
              className={
                msg.role === "user" ? "sb-msg-group sb-msg-group--user" : "sb-msg-group"
              }
            >
              <div
                className={`sb-bubble ${
                  msg.role === "user"
                    ? "sb-bubble-user"
                    : msg.isCoach
                    ? "sb-bubble-coach"
                    : "sb-bubble-bot"
                }`}
              >
                {msg.isCoach && (
                  <span className="sb-coach-label">🧑‍🏫 AI Coach</span>
                )}
                {msg.role === "user" ? (
                  <span className="sb-bubble-text">{msg.content}</span>
                ) : (
                  <MathText className="sb-md">{msg.content}</MathText>
                )}
              </div>

              {/* Flashcard ready card — shown beneath the bot reply bubble */}
              {msg.action?.type === "create_flashcards" && (
                <FlashcardReadyCard
                  setId={msg.action.flashcard_set_id}
                  title={msg.action.flashcard_title}
                  topicId={msg.action.topic_id}
                  numCards={msg.action.num_cards}
                />
              )}

              {/* Quiz ready card — shown beneath the bot reply bubble */}
              {msg.action?.type === "create_quiz" && (() => {
                const qa = msg.action as Extract<AgentAction, { type: "create_quiz" }>;
                return (
                  <QuizReadyCard
                    quizId={qa.quiz_id}
                    title={qa.title}
                    topicId={qa.topic_id}
                    questionCount={qa.question_count}
                    onStart={() => setActiveQuizId(qa.quiz_id)}
                  />
                );
              })()}

              {/* Inline topic picker — shown when bot asks which topic for flashcards */}
              {msg.pickFlashcardTopic && !loading && (
                <div className="sb-topic-picker">
                  {(["ubahan", "matriks", "insurans"] as const).map((tid) => (
                    <button
                      key={tid}
                      type="button"
                      className={`sb-topic-btn sb-topic-btn--${tid}`}
                      onClick={() => sendMessage(`Create 8 flashcards for ${tid}`)}
                      disabled={loading}
                    >
                      🃏 {tid.charAt(0).toUpperCase() + tid.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="sb-msg-group">
              <div className="sb-bubble sb-bubble-bot">
                <span className="sb-typing">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
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
          <div className="sb-input-wrap">
            <textarea
              ref={inputRef}
              className="sb-input"
              rows={1}
              placeholder="Tanya soalan kamu di sini…"
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
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
