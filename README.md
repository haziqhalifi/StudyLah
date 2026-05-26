# StudyLah

**AI-native adaptive learning platform for Malaysian SPM Form 5 Mathematics.**

StudyLah personalises every student's study session using Claude, OpenAI, and Gemini — selecting the next question, writing explanations in Bahasa Malaysia, and scheduling spaced-repetition reviews based on each student's skill profile.

> Built for the *AI in Action* hackathon.

---

## Features

| Feature | What it does |
|---|---|
| **Diagnostic quiz** | 5 MCQ warm-up; AI infers misconceptions per topic |
| **Adaptive question engine** | Picks the next question based on weakest topic + recent accuracy trend |
| **Personalised explanations** | Matches explanation style (step-by-step / formula-first / shortcut / analogy) to student accuracy |
| **Question generation** | Claude generates brand-new MCQs targeting identified skill gaps |
| **Spaced repetition** | Forgetting-curve review scheduler ranks questions by staleness and weakness |
| **Study Buddy chat** | Conversational tutor with KSSM curriculum knowledge base |
| **AI Coach** | Progress-aware recommendations and encouragement |
| **Flashcards** | Auto-generated from question bank; organised by topic |
| **Mock exams** | Full past-paper exam mode with timer |

**Covered SPM topics:** Ubahan (Variation), Matriks (Matrices), Insurans (Insurance/Consumer Math)

---

## Tech stack

**Backend** — Python · FastAPI · Supabase (PostgreSQL) · Pydantic  
**Frontend** — Next.js 14 · React 18 · TypeScript · Tailwind CSS · KaTeX  
**AI** — Anthropic Claude · OpenAI gpt-4o-mini · Google Gemini  
**Deploy** — Railway (backend) · Vercel (frontend)

---

## Getting started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project
- API keys: [Anthropic](https://console.anthropic.com), [OpenAI](https://platform.openai.com), and optionally [Google AI Studio](https://aistudio.google.com)

### 1 — Clone & configure environment

```bash
git clone https://github.com/haziqhalifi/studylah.git
cd studylah
```

Copy the example env files and fill in your keys:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Edit each file with your actual credentials. See [Environment variables](#environment-variables) for details.

### 2 — Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`.

### 3 — Frontend

```bash
cd frontend
npm install
npm run dev                    # http://localhost:3000
```

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Claude API key (adaptive engine, review scheduler) |
| `OPENAI_API_KEY` | ✅ | OpenAI key (explanations, study buddy, coach) |
| `GEMINI_API_KEY` | optional | Google Gemini key (alternative adaptive engine) |
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-side only) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend base URL (e.g. `http://localhost:8000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |

---

## Project structure

```
studylah/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── db.py                   # DB layer (Supabase + in-memory fallback)
│   ├── config/settings.py      # Env-based config
│   ├── routers/                # API route handlers
│   ├── services/
│   │   ├── ai_engine.py        # Core adaptive AI logic (5 functions)
│   │   ├── study_buddy_agent.py
│   │   ├── review_scheduler.py
│   │   ├── spaced_rep_engine.py
│   │   └── ...
│   ├── schemas/                # Pydantic models
│   └── data/seed_questions.py  # Question bank seed data
│
└── frontend/
    ├── app/                    # Next.js App Router pages
    │   ├── page.tsx            # Home / dashboard
    │   ├── diagnostic/         # Diagnostic quiz
    │   ├── learn/              # Adaptive learning loop
    │   ├── review/             # Spaced repetition session
    │   ├── exams/              # Mock exam mode
    │   └── ...
    ├── components/             # Reusable React components
    └── lib/
        ├── api.ts              # Typed backend API client
        └── types.ts            # Shared TypeScript types
```

---

## How the AI works

All AI logic lives in `backend/services/ai_engine.py`. Every function has a rule-based fallback so the app works even without API keys.

| Function | Model | What it does |
|---|---|---|
| `analyze_diagnostic` | OpenAI | Infers misconceptions from wrong-answer patterns |
| `choose_next_question` | Claude / OpenAI | Ranks candidate questions by expected learning gain |
| `generate_explanation` | OpenAI | Writes a personalised explanation in Bahasa Malaysia |
| `generate_personalized_question` | Claude | Creates a new MCQ targeting the student's skill gap |
| `select_review_questions` | Claude | Applies forgetting-curve model to rank review items |

Explanation style adapts to topic accuracy:
- **< 40%** — step-by-step breakdown
- **40–70%** — formula-first approach
- **≥ 70% + wrong** — shortcut tips
- **≥ 70% + correct** — analogy / real-world connection

---

## Deployment

### Railway (backend)

The `railway.toml` is pre-configured. Set all backend env variables in your Railway project and deploy.

### Vercel (frontend)

The `vercel.json` is pre-configured. Set the frontend env variables in your Vercel project settings and deploy.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

[MIT](LICENSE)
