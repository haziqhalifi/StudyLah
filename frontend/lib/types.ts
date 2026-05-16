/**
 * Shared domain types for StudyLah.
 * Chat and API types that were previously embedded in api.ts are kept there
 * for backwards compatibility; new types go here.
 */

// ---------------------------------------------------------------------------
// Quick action chips
// ---------------------------------------------------------------------------

export type QuickActionType =
  | "generate_quiz"
  | "generate_flashcards"
  | "review_mistakes"
  | "explain_topic"
  | "give_hard_question"
  | "show_progress"
  | "hint"
  | "explain_question"
  | "similar_question"
  | "teach_concept"
  | "ask_coach";

export interface QuickAction {
  label: string;
  emoji: string;
  /** The verbatim text sent to StudyBuddy when the chip is tapped. */
  message: string;
  actionType: QuickActionType;
}

// ---------------------------------------------------------------------------
// Learning context — passed from Learn / Review / Quiz pages to the chatbot
// ---------------------------------------------------------------------------

export type TopicId = "ubahan" | "matriks" | "insurans";
export type PageContext = "learn" | "review" | "quiz" | "general";

export interface LearningContext {
  topicId: TopicId;
  topicName: string;         // e.g. "Ubahan (Variation)"
  chapterName?: string;      // e.g. "Direct Variation"
  currentQuestion?: {
    id: string;
    text: string;
    options: string[];
    difficulty: "easy" | "medium" | "hard";
  };
  lastAttempt?: {
    selectedOptionIndex: number;
    isCorrect: boolean;
    correctOptionIndex: number;
  };
  recentAttempts?: Array<{
    questionId: string;
    isCorrect: boolean;
    topicId: string;
  }>;
  pageContext: PageContext;
}

// TODO: extend LearningContext with:
//   - sessionDuration: number (seconds spent on this topic today)
//   - streakCount: number (consecutive correct answers)
//   - weakSubtopics: string[] (e.g. ["inverse variation", "joint variation"])
