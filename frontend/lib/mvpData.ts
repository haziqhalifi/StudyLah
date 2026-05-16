export type TopicId =
  | "algebra"
  | "quadratic_functions"
  | "trigonometry"
  | "probability"
  | "statistics";

export type StageId = "learning" | "practice" | "assessment";

export interface MvpQuestion {
  id: string;
  topicId: TopicId;
  topicLabel: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface TopicContent {
  id: TopicId;
  label: string;
  shortExplanation: string;
  keyConcept: string;
  exampleQuestion: string;
  exampleAnswer: string;
}

export interface DiagnosticResult {
  studentName: string;
  totalQuestions: number;
  score: number;
  correctAnswers: MvpQuestion[];
  incorrectAnswers: MvpQuestion[];
  strongTopics: TopicContent[];
  weakTopics: TopicContent[];
  recommendedTopics: TopicContent[];
  feedbackMessage: string;
}

export const topicContent: TopicContent[] = [
  {
    id: "algebra",
    label: "Algebra",
    shortExplanation:
      "Algebra uses letters to represent unknown values. The goal is to keep both sides of an equation balanced while finding the unknown.",
    keyConcept: "If ax + b = c, then x = (c - b) / a.",
    exampleQuestion: "Solve 3x + 5 = 20.",
    exampleAnswer: "3x = 15, so x = 5.",
  },
  {
    id: "quadratic_functions",
    label: "Quadratic Functions",
    shortExplanation:
      "A quadratic function has the form ax^2 + bx + c. Its graph is a parabola and its roots are where the graph crosses the x-axis.",
    keyConcept: "For ax^2 + bx + c = 0, factorise where possible or use the quadratic formula.",
    exampleQuestion: "Find the roots of x^2 - 5x + 6 = 0.",
    exampleAnswer: "(x - 2)(x - 3) = 0, so x = 2 or x = 3.",
  },
  {
    id: "trigonometry",
    label: "Trigonometry",
    shortExplanation:
      "Trigonometry connects angles and side lengths in right-angled triangles using sine, cosine, and tangent ratios.",
    keyConcept: "SOH CAH TOA: sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent.",
    exampleQuestion: "In a right triangle, opposite = 6 and adjacent = 8. Find tan theta.",
    exampleAnswer: "tan theta = 6 / 8 = 3 / 4.",
  },
  {
    id: "probability",
    label: "Probability",
    shortExplanation:
      "Probability measures how likely an event is to happen. It is written from 0 to 1, where 1 means certain.",
    keyConcept: "Probability = number of favourable outcomes / total possible outcomes.",
    exampleQuestion: "A fair die is rolled. What is the probability of getting an even number?",
    exampleAnswer: "There are 3 even numbers out of 6 outcomes, so the probability is 3/6 = 1/2.",
  },
  {
    id: "statistics",
    label: "Statistics",
    shortExplanation:
      "Statistics helps organise and understand data using measures such as mean, median, mode, and range.",
    keyConcept: "Mean = sum of all values / number of values.",
    exampleQuestion: "Find the mean of 4, 6, 8, and 10.",
    exampleAnswer: "(4 + 6 + 8 + 10) / 4 = 7.",
  },
];

export const diagnosticQuestions: MvpQuestion[] = [
  {
    id: "diag-algebra-1",
    topicId: "algebra",
    topicLabel: "Algebra",
    text: "Solve for x: 2x + 7 = 19.",
    options: ["5", "6", "7", "8"],
    correctOptionIndex: 1,
    explanation: "Subtract 7 from both sides to get 2x = 12. Then divide by 2, so x = 6.",
  },
  {
    id: "diag-quadratic-1",
    topicId: "quadratic_functions",
    topicLabel: "Quadratic Functions",
    text: "Which expression is the factorised form of x^2 - 9?",
    options: ["(x - 9)(x + 1)", "(x - 3)(x + 3)", "(x - 3)(x - 3)", "(x + 9)(x - 1)"],
    correctOptionIndex: 1,
    explanation: "x^2 - 9 is a difference of squares: x^2 - 3^2 = (x - 3)(x + 3).",
  },
  {
    id: "diag-trigo-1",
    topicId: "trigonometry",
    topicLabel: "Trigonometry",
    text: "In a right-angled triangle, opposite = 5 and hypotenuse = 13. What is sin theta?",
    options: ["5/13", "12/13", "5/12", "13/5"],
    correctOptionIndex: 0,
    explanation: "Sine is opposite over hypotenuse, so sin theta = 5/13.",
  },
  {
    id: "diag-probability-1",
    topicId: "probability",
    topicLabel: "Probability",
    text: "A bag has 3 red marbles and 2 blue marbles. What is the probability of picking a blue marble?",
    options: ["2/3", "3/5", "2/5", "1/5"],
    correctOptionIndex: 2,
    explanation: "There are 2 blue marbles out of 5 marbles in total, so the probability is 2/5.",
  },
  {
    id: "diag-statistics-1",
    topicId: "statistics",
    topicLabel: "Statistics",
    text: "Find the mean of 6, 8, 10, and 12.",
    options: ["8", "9", "10", "11"],
    correctOptionIndex: 1,
    explanation: "The sum is 36. Divide by 4 values to get a mean of 9.",
  },
];

export const practiceQuestions: MvpQuestion[] = [
  ...diagnosticQuestions,
  {
    id: "practice-algebra-2",
    topicId: "algebra",
    topicLabel: "Algebra",
    text: "Solve for y: 4y - 3 = 13.",
    options: ["3", "4", "5", "6"],
    correctOptionIndex: 1,
    explanation: "Add 3 to both sides to get 4y = 16. Then y = 4.",
  },
  {
    id: "practice-quadratic-2",
    topicId: "quadratic_functions",
    topicLabel: "Quadratic Functions",
    text: "What is the axis of symmetry for y = x^2 - 4x + 1?",
    options: ["x = -2", "x = 1", "x = 2", "x = 4"],
    correctOptionIndex: 2,
    explanation: "The axis is x = -b / 2a. Here a = 1 and b = -4, so x = 2.",
  },
  {
    id: "practice-trigo-2",
    topicId: "trigonometry",
    topicLabel: "Trigonometry",
    text: "If adjacent = 7 and hypotenuse = 25, what is cos theta?",
    options: ["7/25", "24/25", "7/24", "25/7"],
    correctOptionIndex: 0,
    explanation: "Cosine is adjacent over hypotenuse, so cos theta = 7/25.",
  },
  {
    id: "practice-probability-2",
    topicId: "probability",
    topicLabel: "Probability",
    text: "A fair coin is tossed twice. What is the probability of getting two heads?",
    options: ["1/2", "1/3", "1/4", "3/4"],
    correctOptionIndex: 2,
    explanation: "The outcomes are HH, HT, TH, TT. Only HH has two heads, so the probability is 1/4.",
  },
  {
    id: "practice-statistics-2",
    topicId: "statistics",
    topicLabel: "Statistics",
    text: "What is the median of 3, 7, 8, 11, and 15?",
    options: ["7", "8", "9", "11"],
    correctOptionIndex: 1,
    explanation: "The data is already ordered. The middle value is 8.",
  },
];

export const assessmentQuestions: MvpQuestion[] = [
  {
    id: "assess-algebra-1",
    topicId: "algebra",
    topicLabel: "Algebra",
    text: "Solve: 5x = 45.",
    options: ["5", "7", "9", "11"],
    correctOptionIndex: 2,
    explanation: "x = 45 / 5 = 9.",
  },
  {
    id: "assess-probability-1",
    topicId: "probability",
    topicLabel: "Probability",
    text: "A number from 1 to 10 is chosen. What is the probability it is greater than 6?",
    options: ["2/5", "3/10", "1/2", "4/5"],
    correctOptionIndex: 0,
    explanation: "The numbers greater than 6 are 7, 8, 9, 10. That is 4 out of 10, or 2/5.",
  },
  {
    id: "assess-statistics-1",
    topicId: "statistics",
    topicLabel: "Statistics",
    text: "What is the range of 12, 4, 9, 18, and 7?",
    options: ["10", "12", "14", "18"],
    correctOptionIndex: 2,
    explanation: "Range = highest - lowest = 18 - 4 = 14.",
  },
];

export function getTopic(topicId: TopicId) {
  return topicContent.find((topic) => topic.id === topicId) ?? topicContent[0];
}

export function getStoredAnswers(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem("diagnosticAnswers") ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

export function buildDiagnosticResult(
  studentName: string,
  answers: Record<string, number>
): DiagnosticResult {
  // Diagnostic personalization is intentionally deterministic for the MVP:
  // correct topics become strengths, incorrect topics become revision targets.
  const correctAnswers = diagnosticQuestions.filter(
    (question) => answers[question.id] === question.correctOptionIndex
  );
  const incorrectAnswers = diagnosticQuestions.filter(
    (question) => answers[question.id] !== undefined && answers[question.id] !== question.correctOptionIndex
  );
  const strongTopicIds = new Set(correctAnswers.map((question) => question.topicId));
  const weakTopicIds = new Set(incorrectAnswers.map((question) => question.topicId));
  const weakTopics = topicContent.filter((topic) => weakTopicIds.has(topic.id));
  const strongTopics = topicContent.filter((topic) => strongTopicIds.has(topic.id));
  const recommendedTopics = weakTopics.length > 0 ? weakTopics : topicContent.slice(0, 3);
  const score = correctAnswers.length;

  return {
    studentName,
    totalQuestions: diagnosticQuestions.length,
    score,
    correctAnswers,
    incorrectAnswers,
    strongTopics,
    weakTopics,
    recommendedTopics,
    feedbackMessage: createFeedback(score, diagnosticQuestions.length, recommendedTopics),
  };
}

export function getPersonalizedPracticeQuestions(weakTopicIds: TopicId[], strongTopicIds: TopicId[]) {
  // Weak-topic practice comes first, then stronger topics are mixed in for reinforcement.
  const weakQuestions = practiceQuestions.filter((question) => weakTopicIds.includes(question.topicId));
  const reinforcement = practiceQuestions.filter(
    (question) => strongTopicIds.includes(question.topicId) && !weakTopicIds.includes(question.topicId)
  );
  const fallback = practiceQuestions.filter(
    (question) => !weakTopicIds.includes(question.topicId) && !strongTopicIds.includes(question.topicId)
  );

  return [...weakQuestions, ...reinforcement.slice(0, 2), ...fallback.slice(0, 2)].slice(0, 6);
}

function createFeedback(score: number, total: number, recommendedTopics: TopicContent[]) {
  if (score === total) {
    return "Excellent diagnostic result. Your basics are strong, so your next step is mixed practice to keep speed and accuracy sharp.";
  }

  const topicList = recommendedTopics.map((topic) => topic.label).join(", ");

  if (score >= 3) {
    return `Good foundation. Focus your next revision on ${topicList}, then use practice questions to close the small gaps.`;
  }

  return `You have a clear starting point. Begin with ${topicList} and build confidence one topic at a time.`;
}
