import type { QuickAction } from "./types";

// ---------------------------------------------------------------------------
// Default chips — shown when chat is empty or no learning context is present
// ---------------------------------------------------------------------------

export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Generate Ubahan Quiz",
    emoji: "🎯",
    message: "Generate a personalised Ubahan quiz for me",
    actionType: "generate_quiz",
  },
  {
    label: "Generate Matriks Quiz",
    emoji: "🔢",
    message: "Generate a personalised Matriks quiz for me",
    actionType: "generate_quiz",
  },
  {
    label: "Generate Insurans Quiz",
    emoji: "🛡️",
    message: "Generate a personalised Insurans quiz for me",
    actionType: "generate_quiz",
  },
  {
    label: "Review My Mistakes",
    emoji: "🔄",
    message: "Show me questions I got wrong recently",
    actionType: "review_mistakes",
  },
  {
    label: "Hard Question Please",
    emoji: "💪",
    message: "Give me a challenging question on this topic",
    actionType: "give_hard_question",
  },
  {
    label: "My Progress",
    emoji: "📊",
    message: "How am I doing overall?",
    actionType: "show_progress",
  },
  // TODO: add more default chips as new features are added:
  //   { label: "Daily Challenge", emoji: "🏆", message: "Give me today's challenge question", actionType: "give_hard_question" },
  //   { label: "Explain A Formula", emoji: "📐", message: "Explain the key formulas I need to know", actionType: "explain_topic" },
];

// ---------------------------------------------------------------------------
// Context-aware chips — shown when user is on Learn/Review/Quiz with a question
// ---------------------------------------------------------------------------

export function getContextualQuickActions(
  topicId: string,
  questionText: string,
): QuickAction[] {
  void questionText;

  const topicLabel =
    topicId === "matriks"
      ? "Matriks"
      : topicId === "insurans"
        ? "Insurans"
        : "Ubahan";

  return [
    {
      label: "Hint Please",
      emoji: "💡",
      message: "Give me a hint for this question without revealing the full answer",
      actionType: "hint",
    },
    {
      label: "Step-by-Step",
      emoji: "🔍",
      message: "Explain this question step by step",
      actionType: "explain_question",
    },
    {
      label: "Practice Quiz",
      emoji: "🎯",
      message: `Create a personalised ${topicLabel} quiz for me`,
      actionType: "generate_quiz",
    },
    {
      label: "Teach Me This",
      emoji: "📖",
      message: "Teach me the concept behind this question",
      actionType: "teach_concept",
    },
  ];
}
