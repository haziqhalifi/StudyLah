"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import MathText from "@/components/MathText";
import { postStudyBuddyMessage, ChatMessage } from "@/lib/api";
import { useState } from "react";
import QuizReadyCard from "@/components/QuizReadyCard";

interface Props {
  userId: string;
  questionContext?: string;
  onClose: () => void;
}

export default function StudyBuddyPanel({
  userId,
  questionContext,
  onClose,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        'Hi! I\'m StudyBuddy 👋 I can help you with **Ubahan**, **Matriks**, and **Insurans**.\n\nAsk me anything — or say *"Give me a personalised Ubahan quiz"* to get a custom set! 🚀',
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quizReady, setQuizReady] = useState<null | {
    quizId: string;
    title: string;
    topicId: string;
    questionCount: number;
  }>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
    setQuizReady(null);
    setInput("");
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setLoading(true);

    try {
      const res = await postStudyBuddyMessage(userId, historyToSend);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply },
      ]);

      if (res.action?.type === "create_quiz") {
        setQuizReady({
          quizId: res.action.quiz_id,
          title: res.action.title,
          topicId: res.action.topic_id,
          questionCount: res.action.question_count,
        });
      } else {
        setQuizReady(null);
      }
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

  return (
    <>
      {/* Backdrop — tap to close */}
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

          {quizReady && (
            <QuizReadyCard
              quizId={quizReady.quizId}
              title={quizReady.title}
              topicId={quizReady.topicId}
              questionCount={quizReady.questionCount}
              onStart={() => {
                onClose();
                router.push(`/quiz/${quizReady.quizId}`);
              }}
            />
          )}

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
    </>
  );
}
