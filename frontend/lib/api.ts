/**
 * Typed API client – all backend communication goes through here.
 * Mirrors the Pydantic schemas defined in backend/schemas/.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Shared types (mirror backend Pydantic schemas)
// ---------------------------------------------------------------------------

export type Difficulty = "easy" | "medium" | "hard";
export type ExplanationStyle =
  | "step_by_step"
  | "analogy"
  | "formula_first"
  | "shortcut_tips";
export type Level = "beginner" | "developing" | "proficient" | "advanced";
export type ReviewReason =
  | "low_accuracy"
  | "not_seen_recently"
  | "weak_topic"
  | "due_for_review"
  | "overdue"
  | "new"
  | "learning";

export type ReviewStatus = "learning" | "reviewing" | "mastered";

export interface Question {
  id: string;
  topic_id: string;
  text: string;
  options: string[];
  difficulty: Difficulty;
  tags: string[];
}

export interface Explanation {
  text: string;
  style: ExplanationStyle;
  steps?: string[];
}

export interface TopicStats {
  topic_id: string;
  accuracy: number; // 0.0 – 1.0
  attempts: number;
  correct: number;
  level: Level;
}

export interface SkillProfile {
  user_id: string;
  topics: Record<string, TopicStats>;
}

export interface DiagnosticAnswer {
  question_id: string;
  selected_option_index: number;
}

export interface ReviewState {
  status: ReviewStatus;
  next_review_at: string | null; // ISO datetime
  interval_days: number;
}

export interface ReviewItem {
  question: Question;
  reason: ReviewReason;
  status: ReviewStatus;
  next_review_at: string | null; // ISO datetime
  is_overdue: boolean;
}

export interface SuggestedTopic {
  topic_id: string;
  reason: ReviewReason;
}

// Extended suggestion type used by the progress/review pages
export interface TopicSuggestion {
  topicId: string;
  topicName: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface StartDiagnosticResponse {
  questions: Question[];
}

export interface SubmitDiagnosticResponse {
  skill_profile: SkillProfile;
  next_question: Question;
  message: string;
}

export interface SubmitAnswerResponse {
  is_correct: boolean;
  explanation: Explanation;
  next_question: Question;
  skill_summary: TopicStats | null;
}

export interface AssessmentResponse {
  topics: TopicStats[];
}

export interface ReviewResponse {
  review_items: ReviewItem[];
  suggested_topics: SuggestedTopic[];
  caught_up: boolean;
}

export interface ReviewSubmitResponse {
  is_correct: boolean;
  explanation: Explanation;
  next_review_at: string; // ISO datetime (backward compat)
  review_state: ReviewState;
}

export interface SpacedRepTopicSummary {
  topic_id: string;
  status: "behind" | "on_track" | "ahead";
  due_count: number;
  overdue_count: number;
  next_due_at: string | null; // ISO datetime
}

export interface SpacedRepSummaryResponse {
  topics: SpacedRepTopicSummary[];
}

export interface Paper {
  id: number;
  subject: string;
  state: string | null;
  year: number;
  paper_type: string;
  paper_name: string;
}

export interface PapersResponse {
  papers: Paper[];
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`POST ${path} failed (${res.status}): ${err}`);
  }
  return res.json() as Promise<T>;
}

async function get<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GET ${path} failed (${res.status}): ${err}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

export async function createUser(userId: string, name: string) {
  return post("/api/users/", { user_id: userId, name });
}

export async function startDiagnostic(
  userId: string,
  topicId: string,
  paperId?: number,
): Promise<StartDiagnosticResponse> {
  return post("/api/session/start_diagnostic", {
    user_id: userId,
    topic_id: topicId,
    ...(paperId !== undefined && { paper_id: paperId }),
  });
}

export async function submitDiagnostic(
  userId: string,
  answers: DiagnosticAnswer[],
): Promise<SubmitDiagnosticResponse> {
  return post("/api/session/submit_diagnostic", { user_id: userId, answers });
}

export async function submitAnswer(
  userId: string,
  questionId: string,
  selectedOptionIndex: number,
): Promise<SubmitAnswerResponse> {
  return post("/api/session/submit_answer", {
    user_id: userId,
    question_id: questionId,
    selected_option_index: selectedOptionIndex,
  });
}

export async function generateExplanation(
  userId: string,
  questionId: string,
  selectedOptionIndex: number,
): Promise<Explanation> {
  return get("/api/session/generate_explanation", {
    user_id: userId,
    question_id: questionId,
    selected_option_index: selectedOptionIndex.toString(),
  });
}

export async function getAssessment(
  userId: string,
): Promise<AssessmentResponse> {
  return get("/api/session/assessment", { user_id: userId });
}

export async function getReview(userId: string): Promise<ReviewResponse> {
  return get("/api/session/review", { user_id: userId });
}

export async function submitReviewAnswer(
  userId: string,
  questionId: string,
  selectedOptionIndex: number,
): Promise<ReviewSubmitResponse> {
  return post("/api/session/review/submit", {
    user_id: userId,
    question_id: questionId,
    selected_option_index: selectedOptionIndex,
  });
}

const SUPABASE_URL = "https://pxzyfiysxzwihjplrfvo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4enlmaXlzeHp3aWhqcGxyZnZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTU2OTQsImV4cCI6MjA4OTA5MTY5NH0.NjUwwYGELfBI7MzaAmV_L26n45MVWrrpa2okuxA8VJM";

export async function getPapers(): Promise<PapersResponse> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/papers?select=id,subject,state,year,paper_type,paper_name&order=subject`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    },
  );
  if (!res.ok) throw new Error(`Failed to fetch papers (${res.status})`);
  const papers: Paper[] = await res.json();
  return { papers };
}

export async function getSpacedRepSummary(
  userId: string,
): Promise<SpacedRepSummaryResponse> {
  return get("/api/spaced-rep/summary", { user_id: userId });
}

// ---------------------------------------------------------------------------
// StudyBuddy chat (Gemini-powered agentic tutor)
// ---------------------------------------------------------------------------

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

// Agent action emitted alongside every chat reply
export type AgentAction =
  | { type: "none" }
  | {
      type: "create_quiz";
      quiz_id: string;
      topic_id: "ubahan" | "matriks" | "insurans";
      title: string;
      question_count: number;
    }
  | {
      type: "create_flashcards";
      flashcard_set_id: string;
      flashcard_title: string;
      topic_id: "ubahan" | "matriks" | "insurans";
      num_cards: number;
    };

// Full response from the agentic chat endpoint
export interface ChatResponse {
  reply: string;
  action: AgentAction;
  meta?: { out_of_scope?: boolean; pick_flashcard_topic?: boolean };
}

/** Send the full conversation history and receive an agentic reply. */
export async function postStudyBuddyMessage(
  userId: string,
  messages: ChatMessage[],
  learningContext?: import("./types").LearningContext,
): Promise<ChatResponse> {
  return post("/api/assistant/study-buddy", {
    user_id: userId,
    messages,
    ...(learningContext && { learning_context: learningContext }),
  });
}

/** Legacy alias — kept for backwards compatibility with existing usages. */
export async function chatWithStudyBuddy(
  userId: string,
  messages: ChatMessage[],
): Promise<ChatResponse> {
  return postStudyBuddyMessage(userId, messages);
}

// ---------------------------------------------------------------------------
// Camel-case aliases for the Review flow (matches the feature spec)
// ---------------------------------------------------------------------------

/** Alias for getReview — returns review items and suggested topics. */
export async function fetchReview(userId: string): Promise<ReviewResponse> {
  return getReview(userId);
}
// submitReviewAnswer is already exported at line ~214 — use it directly.

// ---------------------------------------------------------------------------
// Topic progress (used by /progress page)
// ---------------------------------------------------------------------------

export type TopicLevel = "weak" | "okay" | "strong";

export interface TopicProgress {
  topicId: string;
  topicName: string;
  accuracy: number; // 0–1
  level: TopicLevel;
}

// ---------------------------------------------------------------------------
// Personalised quiz
// ---------------------------------------------------------------------------

export type GeneratedQuestion = {
  id: string;
  text: string;
  options: string[];
  difficulty: Difficulty;
  tags: string[];
};

export type QuizDetail = {
  quizId: string;
  topicId: "ubahan" | "matriks" | "insurans";
  title: string;
  questions: GeneratedQuestion[];
};

export type QuizSubmitResult = {
  score: number;
  total: number;
  percentage: number;
  results: Array<{
    questionId: string;
    isCorrect: boolean;
    correctOptionIndex: number;
    explanation: { text: string; style: string };
  }>;
};

export type CreateQuizResponse = {
  quizId: string;
  topicId: "ubahan" | "matriks" | "insurans";
  title: string;
  questionCount: number;
};

function normalizeCreateQuizResponse(raw: any): CreateQuizResponse {
  return {
    quizId: raw.quizId ?? raw.quiz_id,
    topicId: raw.topicId ?? raw.topic_id,
    title: raw.title,
    questionCount: raw.questionCount ?? raw.question_count,
  };
}

/** Fetch a previously-created personalised quiz by ID. */
export async function fetchQuizDetail(quizId: string): Promise<QuizDetail> {
  const raw = await get<any>(`/api/quizzes/${quizId}`);
  return {
    quizId: raw.quizId ?? raw.quiz_id,
    topicId: raw.topicId ?? raw.topic_id,
    title: raw.title,
    questions: raw.questions,
  };
}

/** Backwards-compatible alias used by older pages. */
export async function fetchQuiz(quizId: string): Promise<QuizDetail> {
  return fetchQuizDetail(quizId);
}

/** Create a new personalised quiz for a topic. */
export async function createPersonalizedQuiz(
  userId: string,
  topicId: "ubahan" | "matriks" | "insurans",
  numQuestions = 5,
): Promise<CreateQuizResponse> {
  const raw = await post<any>("/api/quizzes/personalized", {
    userId,
    user_id: userId,
    topicId,
    topic_id: topicId,
    numQuestions,
    num_questions: numQuestions,
  });
  return normalizeCreateQuizResponse(raw);
}

/** Backwards-compatible alias with the original spelling. */
export async function createPersonalisedQuiz(
  userId: string,
  topicId: "ubahan" | "matriks" | "insurans",
  numQuestions = 5,
): Promise<CreateQuizResponse> {
  return createPersonalizedQuiz(userId, topicId, numQuestions);
}

export async function submitQuiz(
  quizId: string,
  userId: string,
  answers: Array<{ questionId: string; selectedOptionIndex: number }>,
): Promise<QuizSubmitResult> {
  return post(`/api/quizzes/${quizId}/submit`, {
    userId,
    user_id: userId,
    answers,
  });
}

// ---------------------------------------------------------------------------
// AI Coach
// ---------------------------------------------------------------------------

export interface CoachTopicStats {
  topic_id: string;
  topic_name: string;
  accuracy: number; // 0–1
  attempts: number;
  last_attempt_at: string | null; // ISO datetime
}

export interface LearningSnapshot {
  user_id: string;
  topics: CoachTopicStats[];
  total_questions_answered: number;
  questions_answered_this_week: number;
  last_active_at: string | null; // ISO datetime
  upcoming_exam_date: string | null; // ISO datetime
}

export type CoachSuggestionType =
  | "do_quiz"
  | "do_review"
  | "focus_topic"
  | "celebration"
  | "consistency_nudge";

export interface CoachSuggestion {
  id: string;
  type: CoachSuggestionType;
  title: string;
  message: string;
  cta_label: string | null;
  cta_action: Record<string, unknown> | null;
  priority: "high" | "medium" | "low";
  created_at: string; // ISO datetime
}

export interface CoachSummaryResponse {
  snapshot: LearningSnapshot;
  suggestions: CoachSuggestion[];
}

export interface CoachMessageResponse {
  reply: string;
  snapshot: LearningSnapshot;
  suggestions: CoachSuggestion[];
}

/** Fetch dashboard-level coaching snapshot + suggestions. */
export async function fetchCoachSummary(
  userId: string,
): Promise<CoachSummaryResponse> {
  return get("/api/coach/summary", { userId });
}

// ---------------------------------------------------------------------------
// Diagnostic Result
// ---------------------------------------------------------------------------

export type DiagnosticTopicId = "ubahan" | "matriks" | "insurans";

export type TopicDiagnostic = {
  topicId: DiagnosticTopicId;
  topicName: string;
  accuracy: number; // 0–1
  attempts: number;
  level: "weak" | "okay" | "strong";
  lastAttemptAt?: string;
};

export type DiagnosticRecommendation = {
  title: string;
  message: string;
  topicId: DiagnosticTopicId;
  suggestedQuizLength: number;
};

export type DiagnosticResult = {
  userId: string;
  totalQuestions: number;
  correctQuestions: number;
  overallAccuracy: number;
  topics: TopicDiagnostic[];
  mainRecommendation: DiagnosticRecommendation;
  secondaryRecommendation?: DiagnosticRecommendation;
};

export async function fetchDiagnosticResult(
  userId: string,
): Promise<DiagnosticResult> {
  return get("/api/diagnostic/result", { userId });
}

// ---------------------------------------------------------------------------
// Flashcards
// ---------------------------------------------------------------------------

export type FlashcardTopicId = "ubahan" | "matriks" | "insurans";

export interface Flashcard {
  id: string;
  set_id: string;
  question: string;
  answer: string;
  topic_id: FlashcardTopicId;
  subtopic?: string;
  created_at: string;
}

export interface FlashcardSet {
  id: string;
  user_id: string;
  topic_id: FlashcardTopicId;
  subtopic?: string;
  title: string;
  description?: string;
  cards: Flashcard[];
  created_at: string;
}

export interface FlashcardSetSummary {
  id: string;
  title: string;
  topic_id: FlashcardTopicId;
  subtopic?: string;
  card_count: number;
}

export async function fetchFlashcardSets(
  userId: string,
): Promise<FlashcardSetSummary[]> {
  return get("/api/flashcards/sets", { userId });
}

export async function fetchFlashcardSet(setId: string): Promise<FlashcardSet> {
  return get(`/api/flashcards/sets/${setId}`);
}

// Extend AgentAction to include the create_flashcards variant.
// Re-declared here so consumers get the full union without importing from two places.
export type AgentActionExtended =
  | { type: "none" }
  | {
      type: "create_quiz";
      quiz_id: string;
      topic_id: FlashcardTopicId;
      title: string;
      question_count: number;
    }
  | {
      type: "create_flashcards";
      flashcard_set_id: string;
      flashcard_title: string;
      topic_id: FlashcardTopicId;
      num_cards: number;
    };

/** Ask the coach a question and get a personalised reply + suggestions. */
export async function fetchCoachMessage(
  userId: string,
  question: string,
  pageContext = "general",
  topicId?: string,
): Promise<CoachMessageResponse> {
  return post("/api/coach/message", {
    userId,
    question,
    pageContext,
    ...(topicId && { topicId }),
  });
}
