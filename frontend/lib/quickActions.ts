import type { LearningContext, QuickAction } from "./types";

// ---------------------------------------------------------------------------
// Default chips — shown when chat is opened with no active question
// ---------------------------------------------------------------------------

export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Tanya Jurulatih AI",
    emoji: "🧑‍🏫",
    message: "Berdasarkan prestasi terkini saya, apakah yang perlu saya fokuskan seterusnya?",
    actionType: "ask_coach",
  },
  {
    label: "Kad Imbas: Ubahan",
    emoji: "🃏",
    message: "Cipta 8 kad imbas untuk ubahan",
    actionType: "generate_flashcards",
  },
  {
    label: "Kad Imbas: Matriks",
    emoji: "🃏",
    message: "Cipta 8 kad imbas untuk matriks",
    actionType: "generate_flashcards",
  },
  {
    label: "Kad Imbas: Insurans",
    emoji: "🃏",
    message: "Cipta 8 kad imbas untuk insurans",
    actionType: "generate_flashcards",
  },
  {
    label: "Kuiz Ubahan",
    emoji: "🎯",
    message: "Jana kuiz Ubahan yang diperibadikan untuk saya",
    actionType: "generate_quiz",
  },
  {
    label: "Kuiz Matriks",
    emoji: "🔢",
    message: "Jana kuiz Matriks yang diperibadikan untuk saya",
    actionType: "generate_quiz",
  },
  {
    label: "Kuiz Insurans",
    emoji: "🛡️",
    message: "Jana kuiz Insurans yang diperibadikan untuk saya",
    actionType: "generate_quiz",
  },
  {
    label: "Semak Kesilapan Saya",
    emoji: "🔄",
    message: "Tunjukkan soalan yang saya jawab salah baru-baru ini",
    actionType: "review_mistakes",
  },
  {
    label: "Kemajuan Saya",
    emoji: "📊",
    message: "Bagaimana prestasi saya secara keseluruhan?",
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
  label: "Tanya Jurulatih AI",
  emoji: "🧑‍🏫",
  message: "Berdasarkan prestasi terkini saya, apakah yang perlu saya fokuskan seterusnya?",
  actionType: "ask_coach",
};

/** Chips when the student answered WRONG — prioritise understanding over practice. */
function getWrongAnswerActions(topicId: string): QuickAction[] {
  return [
    {
      label: "Beri Petunjuk",
      emoji: "💡",
      message: "Berikan saya petunjuk untuk soalan ini tanpa mendedahkan jawapan penuh",
      actionType: "hint",
    },
    {
      label: "Langkah demi Langkah",
      emoji: "🔍",
      message: "Terangkan soalan ini langkah demi langkah",
      actionType: "explain_question",
    },
    {
      label: "Ajar Saya Ini",
      emoji: "📖",
      message: "Ajar saya konsep di sebalik soalan ini",
      actionType: "teach_concept",
    },
    {
      label: "Soalan Serupa",
      emoji: "🔁",
      message: `Berikan saya soalan ${_topicLabel(topicId)} yang serupa untuk berlatih`,
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
      label: "Soalan Serupa",
      emoji: "🔁",
      message: `Berikan saya soalan ${label} yang serupa untuk berlatih`,
      actionType: "similar_question",
    },
    {
      label: `Kuiz ${label}`,
      emoji: "🎯",
      message: `Cipta kuiz ${label} yang diperibadikan untuk saya`,
      actionType: "generate_quiz",
    },
    {
      label: `Kad Imbas ${label}`,
      emoji: "🃏",
      message: `Cipta 8 kad imbas untuk ${topicId}`,
      actionType: "generate_flashcards",
    },
    {
      label: "Langkah demi Langkah",
      emoji: "🔍",
      message: "Terangkan soalan ini langkah demi langkah",
      actionType: "explain_question",
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
      label: "Beri Petunjuk",
      emoji: "💡",
      message: "Berikan saya petunjuk untuk soalan ini tanpa mendedahkan jawapan penuh",
      actionType: "hint",
    },
    {
      label: "Langkah demi Langkah",
      emoji: "🔍",
      message: "Terangkan soalan ini langkah demi langkah",
      actionType: "explain_question",
    },
    {
      label: "Kuiz Latihan",
      emoji: "🎯",
      message: `Cipta kuiz ${label} yang diperibadikan untuk saya`,
      actionType: "generate_quiz",
    },
    {
      label: "Ajar Saya Ini",
      emoji: "📖",
      message: "Ajar saya konsep di sebalik soalan ini",
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
