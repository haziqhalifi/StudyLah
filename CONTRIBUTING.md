# Contributing to StudyLah

Thanks for your interest in contributing! Here's everything you need to know.

## Development setup

Follow the [Getting started](README.md#getting-started) steps in the README to get the app running locally.

## Branching

- `main` — stable, deployable
- `develop` — integration branch (create PRs here)
- Feature branches: `feat/<short-description>`
- Bug fixes: `fix/<short-description>`

## Making changes

1. Fork the repo and create your branch from `develop`.
2. Make your changes with clear, focused commits.
3. Run the checks below before opening a PR.
4. Open a pull request to `develop` with a description of what and why.

## Checks before submitting

**Backend**
```bash
cd backend
pip install -r requirements.txt
python -m pytest                         # if tests exist
uvicorn main:app --reload --port 8000    # smoke-test the API
```

**Frontend**
```bash
cd frontend
npm install
npm run lint
npm run build
```

## What to work on

- Open [issues](https://github.com/haziqhalifi/studylah/issues) are the best place to start.
- Check issues labelled `good first issue` if you're new to the codebase.
- For large changes, open an issue first to discuss the approach before writing code.

## Code style

- **Python:** follow PEP 8; use type hints throughout.
- **TypeScript:** strict mode is on — no `any` unless truly unavoidable.
- **Comments:** only when the *why* is non-obvious (not the *what*).
- **Malay language:** all student-facing strings should be in Bahasa Malaysia.

## Adding new topics

1. Add seed questions to `backend/data/seed_questions.py`.
2. Add KSSM knowledge to `backend/services/kssm_retriever.py`.
3. Add a materials page under `frontend/app/materials/`.

## Questions?

Open an issue or start a GitHub Discussion.
