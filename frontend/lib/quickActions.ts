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
  // topicId and questionText are available for future prompt customisation.
  // Currently the messages are intentionally generic so the backend context
  // injection (LearningContext) does the personalisation work.
  void topicId;
  void questionText;

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
      label: "Similar Question",
      emoji: "🔁",
      message: "Generate a similar question to this one so I can practise",
      actionType: "similar_question",
    },
    {
      label: "Teach Me This",
      emoji: "📖",
      message: "Teach me the concept behind this question",
      actionType: "teach_concept",
    },
    // TODO: add context-aware chips:
    //   { label: "Why Wrong?", emoji: "❌", message: "Why was my last answer wrong?", actionType: "explain_question" },
    //   { label: "Easier Version", emoji: "⬇️", message: "Give me an easier version of this question", actionType: "similar_question" },
  ];
}
