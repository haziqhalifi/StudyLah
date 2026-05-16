/**
 * Typed API client – all backend communication goes through here.
 * Mirrors the Pydantic schemas defined in backend/schemas/.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Shared types (mirror backend Pydantic schemas)
// ---------------------------------------------------------------------------

export type Difficulty = "easy" | "medium" | "hard";
export type ExplanationStyle = "step_by_step" | "analogy" | "formula_first" | "shortcut_tips";
export type Level = "beginner" | "developing" | "proficient" | "advanced";
export type ReviewReason = "low_accuracy" | "not_seen_recently";

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

export interface ReviewItem {
  question: Question;
  reason: ReviewReason;
}

export interface SuggestedTopic {
  topic_id: string;
  reason: ReviewReason;
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
  review_questions: ReviewItem[];
  suggested_topics: SuggestedTopic[];
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

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
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
  paperId?: number
): Promise<StartDiagnosticResponse> {
  return post("/api/session/start_diagnostic", {
    user_id: userId,
    topic_id: topicId,
    ...(paperId !== undefined && { paper_id: paperId }),
  });
}

export async function submitDiagnostic(
  userId: string,
  answers: DiagnosticAnswer[]
): Promise<SubmitDiagnosticResponse> {
  return post("/api/session/submit_diagnostic", { user_id: userId, answers });
}

export async function submitAnswer(
  userId: string,
  questionId: string,
  selectedOptionIndex: number
): Promise<SubmitAnswerResponse> {
  return post("/api/session/submit_answer", {
    user_id: userId,
    question_id: questionId,
    selected_option_index: selectedOptionIndex,
  });
}

export async function getAssessment(userId: string): Promise<AssessmentResponse> {
  return get("/api/session/assessment", { user_id: userId });
}

export async function getReview(userId: string): Promise<ReviewResponse> {
  return get("/api/session/review", { user_id: userId });
}

export async function getPapers(): Promise<PapersResponse> {
  return get("/api/session/papers");
}
