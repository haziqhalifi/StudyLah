import type { LearningContext, QuickAction } from "./types";

// ---------------------------------------------------------------------------
// Default chips — shown when chat is opened with no active question
// ---------------------------------------------------------------------------

export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Ask AI Coach",
    emoji: "🧑‍🏫",
    message: "Based on my recent performance, what should I focus on next?",
    actionType: "ask_coach",
  },
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
];

// ---------------------------------------------------------------------------
// Context-aware chips — adapted to the student's last attempt result
// ---------------------------------------------------------------------------

function _topicLabel(topicId: string): string {
  if (topicId === "matriks") return "Matriks";
  if (topicId === "insurans") return "Insurans";
  return "Ubahan";
}

const COACH_CHIP: QuickAction = {
  label: "Ask AI Coach",
  emoji: "🧑‍🏫",
  message: "Based on my recent performance, what should I focus on next?",
  actionType: "ask_coach",
};

/** Chips when the student answered WRONG — prioritise understanding over practice. */
function getWrongAnswerActions(topicId: string): QuickAction[] {
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
      label: "Teach Me This",
      emoji: "📖",
      message: "Teach me the concept behind this question",
      actionType: "teach_concept",
    },
    {
      label: "Similar Question",
      emoji: "🔁",
      message: `Give me a similar ${_topicLabel(topicId)} question to practise`,
      actionType: "similar_question",
    },
    COACH_CHIP,
  ];
}

/** Chips when the student answered CORRECTLY — lean into momentum. */
function getCorrectAnswerActions(topicId: string): QuickAction[] {
  const label = _topicLabel(topicId);
  return [
    {
      label: "Similar Question",
      emoji: "🔁",
      message: `Give me a similar ${label} question to practise`,
      actionType: "similar_question",
    },
    {
      label: `${label} Quiz`,
      emoji: "🎯",
      message: `Create a personalised ${label} quiz for me`,
      actionType: "generate_quiz",
    },
    {
      label: "Step-by-Step",
      emoji: "🔍",
      message: "Explain this question step by step",
      actionType: "explain_question",
    },
    {
      label: "Teach Me This",
      emoji: "📖",
      message: "Teach me the concept behind this question",
      actionType: "teach_concept",
    },
    COACH_CHIP,
  ];
}

/** Chips when there is a current question but no attempt yet. */
export function getContextualQuickActions(
  topicId: string,
  _questionText: string,
): QuickAction[] {
  const label = _topicLabel(topicId);
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
      message: `Create a personalised ${label} quiz for me`,
      actionType: "generate_quiz",
    },
    {
      label: "Teach Me This",
      emoji: "📖",
      message: "Teach me the concept behind this question",
      actionType: "teach_concept",
    },
    COACH_CHIP,
  ];
}

/**
 * Main entry point — picks the right chip set based on the full LearningContext.
 * Use this in StudyBuddyChat instead of calling the individual helpers directly.
 */
export function getChipsForContext(ctx: LearningContext | undefined): QuickAction[] {
  if (!ctx?.currentQuestion) return DEFAULT_QUICK_ACTIONS;

  if (ctx.lastAttempt !== undefined) {
    return ctx.lastAttempt.isCorrect
      ? getCorrectAnswerActions(ctx.topicId)
      : getWrongAnswerActions(ctx.topicId);
  }

  return getContextualQuickActions(ctx.topicId, ctx.currentQuestion.text);
}
