from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Support running from the project root (`uvicorn backend.main:app`) or
# from inside the `backend` folder (`cd backend && uvicorn main:app`).
try:
    from backend.routers import session, users
except ModuleNotFoundError:
    # If running from inside the `backend` folder (cwd=backend), Python's
    # import paths won't include the project root, so absolute imports like
    # `from backend import db` used in routers fail. Add the project root to
    # sys.path then re-import using absolute package paths.
    import sys
    from pathlib import Path

    project_root = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(project_root))
    from backend.routers import session, users

app = FastAPI(title="StudyLah API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session.router)
app.include_router(users.router, prefix="/api/users", tags=["users"])


@app.get("/")
def root():
    return {"message": "StudyLah API is running"}
