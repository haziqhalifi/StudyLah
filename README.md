# StudyLah – AI-Native Adaptive Learning

Hackathon project built for the "AI in Action" theme.

## Quick start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000  # runs on http://localhost:3000
```

## User flow

1. `/` – Enter name → create user
2. `/diagnostic` – 5 MCQ questions (AI analyses results)
3. `/learn` – Adaptive MCQ loop with personalised explanations
4. `/assessment` – Live accuracy/level per topic
5. `/review` – Spaced repetition session

## AI engine touch-points

All AI logic lives in `backend/services/ai_engine.py`.  
Every `# TODO: Call Claude here` marks a drop-in point for Anthropic API calls.

| Function                         | What Claude will do                                      |
| -------------------------------- | -------------------------------------------------------- |
| `analyze_diagnostic`             | Infer misconceptions from answer patterns                |
| `choose_next_question`           | Rank and select the optimal next question                |
| `generate_explanation`           | Write personalised explanation in chosen style           |
| `generate_personalized_question` | Create a brand-new MCQ targeting the skill gap           |
| `select_review_questions`        | Rank questions by forgetting curve for spaced repetition |
