"""
Seed question bank for StudyLah demo.

Three SPM Form 5 Math topics:
  - ubahan   (Variation)
  - matriks  (Matrices)
  - insurans (Consumer Math: Insurance)

Each topic has 5 easy + 5 medium + 3 hard MCQs = 13 questions per topic, 39 total.

Usage
-----
From anywhere in the backend:

    from backend.data.seed_questions import SEED_QUESTIONS, get_seed_questions

    # All questions as Question objects
    all_qs = get_seed_questions()

    # Filter by topic
    ubahan_qs = get_seed_questions(topic_id="ubahan")

    # Raw dicts (matches Question schema fields exactly)
    for q in SEED_QUESTIONS:
        print(q["id"], q["topic_id"], q["difficulty"])

Integration with db.py
-----------------------
The seeded questions are intentionally kept in-memory for the hackathon demo.
To serve them alongside Supabase questions, patch get_all_questions() in db.py:

    from backend.data.seed_questions import get_seed_questions

    def get_all_questions(topic_id=None, limit=50):
        # ... existing Supabase query ...
        supabase_qs = [_row_to_question(r) for r in response.data]
        seed_qs = get_seed_questions(topic_id=topic_id)
        # Merge, seed first so they appear in rotation
        merged = seed_qs + supabase_qs
        return merged[:limit]

Questions are also persisted in the studylah_questions Supabase table.
The in-memory list serves as a zero-latency fallback if Supabase is unreachable.
"""

from __future__ import annotations

from typing import List, Literal, Optional

from backend.schemas.question import Question

# ---------------------------------------------------------------------------
# Raw seed data — plain dicts so this file has zero import side-effects.
# Fields match backend.schemas.question.Question exactly.
# ---------------------------------------------------------------------------

SEED_QUESTIONS: list[dict] = [

    # =========================================================================
    # UBAHAN (Variation) — 5 easy, 5 medium, 3 hard
    # =========================================================================

    # --- Easy ----------------------------------------------------------------

    {
        "id": "seed-ubahan-e1",
        "topic_id": "ubahan",
        "text": "If y varies directly as x, and y = 12 when x = 4, find the value of y when x = 7.",
        "options": ["18", "21", "24", "28"],
        "correct_option_index": 1,
        "difficulty": "easy",
        "tags": ["ubahan", "direct_variation"],
    },
    {
        "id": "seed-ubahan-e2",
        "topic_id": "ubahan",
        "text": "Which of the following represents 'p varies directly as q'?",
        "options": ["p = kq²", "p = k/q", "p = kq", "p = k√q"],
        "correct_option_index": 2,
        "difficulty": "easy",
        "tags": ["ubahan", "direct_variation"],
    },
    {
        "id": "seed-ubahan-e3",
        "topic_id": "ubahan",
        "text": "If y varies inversely as x, and y = 6 when x = 4, find y when x = 8.",
        "options": ["12", "4", "3", "2"],
        "correct_option_index": 2,
        "difficulty": "easy",
        "tags": ["ubahan", "inverse_variation"],
    },
    {
        "id": "seed-ubahan-e4",
        "topic_id": "ubahan",
        "text": "Given that y ∝ x and the constant of variation k = 5, what is y when x = 9?",
        "options": ["14", "40", "45", "50"],
        "correct_option_index": 2,
        "difficulty": "easy",
        "tags": ["ubahan", "direct_variation"],
    },
    {
        "id": "seed-ubahan-e5",
        "topic_id": "ubahan",
        "text": "If m varies inversely as n, which equation correctly expresses this relationship?",
        "options": ["m = kn", "mn = k", "m + n = k", "m − n = k"],
        "correct_option_index": 1,
        "difficulty": "easy",
        "tags": ["ubahan", "inverse_variation"],
    },

    # --- Medium --------------------------------------------------------------

    {
        "id": "seed-ubahan-m1",
        "topic_id": "ubahan",
        "text": (
            "y varies directly as the square of x. When x = 3, y = 36. "
            "Find y when x = 5."
        ),
        "options": ["60", "75", "100", "125"],
        "correct_option_index": 2,
        "difficulty": "medium",
        "tags": ["ubahan", "direct_variation"],
    },
    {
        "id": "seed-ubahan-m2",
        "topic_id": "ubahan",
        "text": (
            "p varies inversely as the square root of q. "
            "When q = 9, p = 6. Find p when q = 4."
        ),
        "options": ["4", "8", "9", "12"],
        "correct_option_index": 2,
        "difficulty": "medium",
        "tags": ["ubahan", "inverse_variation"],
    },
    {
        "id": "seed-ubahan-m3",
        "topic_id": "ubahan",
        "text": (
            "z varies jointly as x and y. When x = 2 and y = 5, z = 30. "
            "Find z when x = 3 and y = 4."
        ),
        "options": ["27", "36", "45", "72"],
        "correct_option_index": 1,
        "difficulty": "medium",
        "tags": ["ubahan", "joint_variation"],
    },
    {
        "id": "seed-ubahan-m4",
        "topic_id": "ubahan",
        "text": (
            "y varies partly as x and partly as x². "
            "When x = 1, y = 5 and when x = 2, y = 14. "
            "Find y when x = 3."
        ),
        "options": ["23", "27", "29", "33"],
        "correct_option_index": 1,
        "difficulty": "medium",
        "tags": ["ubahan", "partial_variation"],
    },
    {
        "id": "seed-ubahan-m5",
        "topic_id": "ubahan",
        "text": (
            "It is given that r ∝ 1/s². When s = 2, r = 5. "
            "Find the value of r when s = 10."
        ),
        "options": ["0.1", "0.2", "0.5", "1"],
        "correct_option_index": 1,
        "difficulty": "medium",
        "tags": ["ubahan", "inverse_variation"],
    },

    # --- Hard ----------------------------------------------------------------

    {
        "id": "seed-ubahan-h1",
        "topic_id": "ubahan",
        "text": (
            "y varies partly as x and partly constant. "
            "When x = 3, y = 11, and when x = 7, y = 23. "
            "Express y in terms of x."
        ),
        "options": ["y = 3x + 2", "y = 2x + 5", "y = 4x − 1", "y = 3x − 2"],
        "correct_option_index": 0,
        "difficulty": "hard",
        "tags": ["ubahan", "partial_variation"],
    },
    {
        "id": "seed-ubahan-h2",
        "topic_id": "ubahan",
        "text": (
            "p varies directly as q and inversely as the square of r. "
            "When q = 4 and r = 2, p = 6. "
            "Find r when p = 8 and q = 16."
        ),
        "options": ["√3", "2", "√6", "3"],
        "correct_option_index": 0,
        "difficulty": "hard",
        "tags": ["ubahan", "joint_variation", "inverse_variation"],
    },
    {
        "id": "seed-ubahan-h3",
        "topic_id": "ubahan",
        "text": (
            "x varies directly as √y and inversely as z. "
            "When y = 4 and z = 3, x = 10. "
            "If y is increased by 44% and z is decreased by 25%, "
            "find the percentage change in x."
        ),
        "options": ["Increases by 19%", "Increases by 26%", "Increases by 43%", "Increases by 80%"],
        "correct_option_index": 1,
        "difficulty": "hard",
        "tags": ["ubahan", "joint_variation", "percentage_change"],
    },

    # =========================================================================
    # MATRIKS (Matrices) — 5 easy, 5 medium, 3 hard
    # =========================================================================

    # --- Easy ----------------------------------------------------------------

    {
        "id": "seed-matriks-e1",
        "topic_id": "matriks",
        "text": "What is the order of the matrix [[1, 2, 3], [4, 5, 6]]?",
        "options": ["3 × 2", "2 × 3", "6 × 1", "1 × 6"],
        "correct_option_index": 1,
        "difficulty": "easy",
        "tags": ["matriks", "matrix_order"],
    },
    {
        "id": "seed-matriks-e2",
        "topic_id": "matriks",
        "text": (
            "Given A = [[2, 1], [3, 4]] and B = [[1, 0], [2, 3]], "
            "find A + B."
        ),
        "options": [
            "[[3, 1], [5, 7]]",
            "[[3, 2], [5, 7]]",
            "[[3, 1], [6, 7]]",
            "[[2, 1], [5, 7]]",
        ],
        "correct_option_index": 0,
        "difficulty": "easy",
        "tags": ["matriks", "matrix_addition"],
    },
    {
        "id": "seed-matriks-e3",
        "topic_id": "matriks",
        "text": "What is the identity matrix of order 2 × 2?",
        "options": [
            "[[0, 0], [0, 0]]",
            "[[1, 1], [1, 1]]",
            "[[1, 0], [0, 1]]",
            "[[0, 1], [1, 0]]",
        ],
        "correct_option_index": 2,
        "difficulty": "easy",
        "tags": ["matriks", "identity_matrix"],
    },
    {
        "id": "seed-matriks-e4",
        "topic_id": "matriks",
        "text": (
            "Given M = [[3, -1], [-2, 4]], what is the determinant of M?"
        ),
        "options": ["10", "14", "12", "−10"],
        "correct_option_index": 0,
        "difficulty": "easy",
        "tags": ["matriks", "determinant"],
    },
    {
        "id": "seed-matriks-e5",
        "topic_id": "matriks",
        "text": (
            "Which condition must be satisfied for matrix A (order m × n) "
            "to be multiplied by matrix B (order p × q)?"
        ),
        "options": [
            "m = p",
            "n = p",
            "m = q",
            "n = q",
        ],
        "correct_option_index": 1,
        "difficulty": "easy",
        "tags": ["matriks", "matrix_multiplication"],
    },

    # --- Medium --------------------------------------------------------------

    {
        "id": "seed-matriks-m1",
        "topic_id": "matriks",
        "text": (
            "Given A = [[1, 2], [3, 4]], find A⁻¹."
        ),
        "options": [
            "[[-2, 1], [3/2, -1/2]]",
            "[[-4, 2], [3, -1]]",
            "[[-2, 1], [1.5, -0.5]]",
            "[[4, -2], [-3, 1]]",
        ],
        "correct_option_index": 2,
        "difficulty": "medium",
        "tags": ["matriks", "inverse_matrix"],
    },
    {
        "id": "seed-matriks-m2",
        "topic_id": "matriks",
        "text": (
            "Solve the matrix equation: [[2, 1], [5, 3]] × X = [[4], [11]]."
        ),
        "options": [
            "X = [[1], [2]]",
            "X = [[2], [1]]",
            "X = [[3], [-2]]",
            "X = [[-1], [6]]",
        ],
        "correct_option_index": 0,
        "difficulty": "medium",
        "tags": ["matriks", "simultaneous_equations", "inverse_matrix"],
    },
    {
        "id": "seed-matriks-m3",
        "topic_id": "matriks",
        "text": (
            "Given A = [[k, 2], [3, k]] has no inverse, find k."
        ),
        "options": ["±6", "±√6", "±3", "±2"],
        "correct_option_index": 1,
        "difficulty": "medium",
        "tags": ["matriks", "determinant", "singular_matrix"],
    },
    {
        "id": "seed-matriks-m4",
        "topic_id": "matriks",
        "text": (
            "A = [[2, 1], [1, 3]] and B = [[0, -1], [2, 1]]. "
            "Calculate AB."
        ),
        "options": [
            "[[2, -1], [6, 2]]",
            "[[2, -1], [5, 2]]",
            "[[2, -1], [6, 4]]",
            "[[4, -1], [6, 2]]",
        ],
        "correct_option_index": 0,
        "difficulty": "medium",
        "tags": ["matriks", "matrix_multiplication"],
    },
    {
        "id": "seed-matriks-m5",
        "topic_id": "matriks",
        "text": (
            "Given that [[3, h], [1, 2]] is a singular matrix, find h."
        ),
        "options": ["1", "3", "6", "−6"],
        "correct_option_index": 2,
        "difficulty": "medium",
        "tags": ["matriks", "singular_matrix", "determinant"],
    },

    # --- Hard ----------------------------------------------------------------

    {
        "id": "seed-matriks-h1",
        "topic_id": "matriks",
        "text": (
            "Use matrices to solve the simultaneous equations:\n"
            "3x + 2y = 7\n"
            "5x + 4y = 11\n"
            "What are the values of x and y?"
        ),
        "options": [
            "x = 3, y = −1",
            "x = 1, y = 2",
            "x = 2, y = 0.5",
            "x = −1, y = 5",
        ],
        "correct_option_index": 0,
        "difficulty": "hard",
        "tags": ["matriks", "simultaneous_equations", "inverse_matrix"],
    },
    {
        "id": "seed-matriks-h2",
        "topic_id": "matriks",
        "text": (
            "A company makes two products P and Q. "
            "Product P requires 2 kg of material A and 3 kg of material B. "
            "Product Q requires 1 kg of material A and 4 kg of material B. "
            "If 14 kg of A and 29 kg of B are available, "
            "how many units of P and Q can be produced?"
        ),
        "options": [
            "P = 5, Q = 4",
            "P = 3, Q = 8",
            "P = 4, Q = 5",
            "P = 6, Q = 2",
        ],
        "correct_option_index": 1,
        "difficulty": "hard",
        "tags": ["matriks", "real_world_application", "simultaneous_equations"],
    },
    {
        "id": "seed-matriks-h3",
        "topic_id": "matriks",
        "text": (
            "Given M = [[p, 3], [2, p]] and M² = [[13, 12], [8, 13]], "
            "find the value of p."
        ),
        "options": ["1", "2", "3", "4"],
        "correct_option_index": 1,
        "difficulty": "hard",
        "tags": ["matriks", "matrix_power"],
    },

    # =========================================================================
    # INSURANS (Consumer Math: Insurance) — 5 easy, 5 medium, 3 hard
    # =========================================================================

    # --- Easy ----------------------------------------------------------------

    {
        "id": "seed-insurans-e1",
        "topic_id": "insurans",
        "text": (
            "A house is insured for RM 200,000 at a premium rate of 0.3% per annum. "
            "What is the annual premium?"
        ),
        "options": ["RM 200", "RM 600", "RM 2,000", "RM 6,000"],
        "correct_option_index": 1,
        "difficulty": "easy",
        "tags": ["insurans", "premium_calculation"],
    },
    {
        "id": "seed-insurans-e2",
        "topic_id": "insurans",
        "text": "What does the term 'sum insured' mean in an insurance policy?",
        "options": [
            "The amount of premium paid per year",
            "The maximum amount the insurer will pay on a claim",
            "The total loss suffered by the insured",
            "The deductible amount before the claim is paid",
        ],
        "correct_option_index": 1,
        "difficulty": "easy",
        "tags": ["insurans", "insurance_terms"],
    },
    {
        "id": "seed-insurans-e3",
        "topic_id": "insurans",
        "text": (
            "Ahmad insures his car for RM 50,000 at a rate of 2.5% per annum. "
            "Calculate the monthly premium."
        ),
        "options": ["RM 52.08", "RM 104.17", "RM 125.00", "RM 1,250.00"],
        "correct_option_index": 1,
        "difficulty": "easy",
        "tags": ["insurans", "premium_calculation"],
    },
    {
        "id": "seed-insurans-e4",
        "topic_id": "insurans",
        "text": "Which statement about 'under-insurance' is correct?",
        "options": [
            "The insured pays a lower premium than the standard rate.",
            "The sum insured is less than the actual value of the property.",
            "The insurer refuses to pay the claim.",
            "The policy covers losses below a certain minimum.",
        ],
        "correct_option_index": 1,
        "difficulty": "easy",
        "tags": ["insurans", "under_insurance"],
    },
    {
        "id": "seed-insurans-e5",
        "topic_id": "insurans",
        "text": (
            "A factory worth RM 500,000 is insured for RM 500,000 "
            "and suffers a loss of RM 80,000. "
            "How much will the insurer pay (fully insured, no average clause)?"
        ),
        "options": ["RM 40,000", "RM 60,000", "RM 80,000", "RM 500,000"],
        "correct_option_index": 2,
        "difficulty": "easy",
        "tags": ["insurans", "claim_calculation"],
    },

    # --- Medium --------------------------------------------------------------

    {
        "id": "seed-insurans-m1",
        "topic_id": "insurans",
        "text": (
            "A property worth RM 400,000 is insured for only RM 300,000. "
            "A fire causes a loss of RM 120,000. "
            "Using the average clause, how much will the insurer pay?"
        ),
        "options": ["RM 60,000", "RM 90,000", "RM 100,000", "RM 120,000"],
        "correct_option_index": 1,
        "difficulty": "medium",
        "tags": ["insurans", "average_clause", "under_insurance"],
    },
    {
        "id": "seed-insurans-m2",
        "topic_id": "insurans",
        "text": (
            "The average clause formula is:\n"
            "Compensation = (Sum Insured ÷ Property Value) × Loss\n\n"
            "A shop worth RM 600,000 is insured for RM 450,000. "
            "If a flood causes RM 200,000 damage, "
            "calculate the compensation paid."
        ),
        "options": ["RM 100,000", "RM 133,333", "RM 150,000", "RM 200,000"],
        "correct_option_index": 2,
        "difficulty": "medium",
        "tags": ["insurans", "average_clause"],
    },
    {
        "id": "seed-insurans-m3",
        "topic_id": "insurans",
        "text": (
            "Siti pays a monthly premium of RM 250 for a life insurance policy. "
            "If the annual premium rate is 2%, what is her sum insured?"
        ),
        "options": ["RM 100,000", "RM 125,000", "RM 150,000", "RM 200,000"],
        "correct_option_index": 2,
        "difficulty": "medium",
        "tags": ["insurans", "premium_calculation", "sum_insured"],
    },
    {
        "id": "seed-insurans-m4",
        "topic_id": "insurans",
        "text": (
            "A car is valued at RM 80,000 and is insured for RM 60,000 "
            "(under-insurance). The car is involved in an accident "
            "causing RM 24,000 damage. "
            "How much does the insurer pay under the average clause?"
        ),
        "options": ["RM 12,000", "RM 16,000", "RM 18,000", "RM 24,000"],
        "correct_option_index": 2,
        "difficulty": "medium",
        "tags": ["insurans", "average_clause", "under_insurance"],
    },
    {
        "id": "seed-insurans-m5",
        "topic_id": "insurans",
        "text": (
            "Farid has a medical insurance policy with an annual premium of RM 3,600 "
            "and a no-claim discount (NCD) of 15% after one year with no claims. "
            "What is his premium in the second year?"
        ),
        "options": ["RM 2,880", "RM 3,060", "RM 3,060", "RM 3,240"],
        "correct_option_index": 1,
        "difficulty": "medium",
        "tags": ["insurans", "ncd", "premium_calculation"],
    },

    # --- Hard ----------------------------------------------------------------

    {
        "id": "seed-insurans-h1",
        "topic_id": "insurans",
        "text": (
            "A building valued at RM 1,200,000 is insured with two insurers:\n"
            "  Insurer A: RM 600,000\n"
            "  Insurer B: RM 400,000\n"
            "A fire causes damage of RM 300,000. "
            "How much does Insurer A pay under the contribution principle?"
        ),
        "options": ["RM 90,000", "RM 120,000", "RM 150,000", "RM 180,000"],
        "correct_option_index": 3,
        "difficulty": "hard",
        "tags": ["insurans", "contribution", "multiple_policies"],
    },
    {
        "id": "seed-insurans-h2",
        "topic_id": "insurans",
        "text": (
            "A factory is worth RM 2,000,000. It is insured for RM 1,500,000. "
            "A fire destroys part of the factory causing a loss of RM 800,000. "
            "Using the average clause, calculate:\n"
            "(a) The compensation paid\n"
            "(b) The uncompensated loss borne by the owner"
        ),
        "options": [
            "Compensation = RM 600,000; Uncompensated = RM 200,000",
            "Compensation = RM 500,000; Uncompensated = RM 300,000",
            "Compensation = RM 600,000; Uncompensated = RM 300,000",
            "Compensation = RM 750,000; Uncompensated = RM 50,000",
        ],
        "correct_option_index": 0,
        "difficulty": "hard",
        "tags": ["insurans", "average_clause", "under_insurance"],
    },
    {
        "id": "seed-insurans-h3",
        "topic_id": "insurans",
        "text": (
            "Mrs Lim insures her house (value RM 500,000) for RM 400,000 "
            "at a rate of 0.4% per annum with a 5% loading for flood risk. "
            "Calculate her annual premium."
        ),
        "options": ["RM 1,680", "RM 2,000", "RM 2,100", "RM 2,520"],
        "correct_option_index": 0,
        "difficulty": "hard",
        "tags": ["insurans", "premium_calculation", "loading"],
    },
]


# ---------------------------------------------------------------------------
# Public helper
# ---------------------------------------------------------------------------

def get_seed_questions(
    topic_id: Optional[str] = None,
    difficulty: Optional[Literal["easy", "medium", "hard"]] = None,
) -> List[Question]:
    """Return seeded Question objects, optionally filtered by topic and/or difficulty."""
    rows = SEED_QUESTIONS
    if topic_id:
        rows = [r for r in rows if r["topic_id"] == topic_id]
    if difficulty:
        rows = [r for r in rows if r["difficulty"] == difficulty]
    return [Question(**r) for r in rows]


# ---------------------------------------------------------------------------
# QuestionRepository (simple in-memory pattern)
# ---------------------------------------------------------------------------

class QuestionRepository:
    """
    Thin wrapper around the in-memory seed list.
    Extend with a Supabase backend once the question schema is stable.
    """

    @staticmethod
    def get_all(
        topic_id: Optional[str] = None,
        difficulty: Optional[Literal["easy", "medium", "hard"]] = None,
    ) -> List[Question]:
        return get_seed_questions(topic_id=topic_id, difficulty=difficulty)

    @staticmethod
    def get_by_id(question_id: str) -> Optional[Question]:
        for row in SEED_QUESTIONS:
            if row["id"] == question_id:
                return Question(**row)
        return None

    @staticmethod
    def get_topics() -> List[str]:
        return list({r["topic_id"] for r in SEED_QUESTIONS})
