from fastapi import APIRouter, HTTPException

import db
from schemas.session import CreateUserRequest, UserResponse
from schemas.question import SkillProfile, TopicStats

router = APIRouter()

# Minimal in-memory user store
_users: dict[str, str] = {}  # user_id → name


@router.post("/", response_model=UserResponse)
def create_user(req: CreateUserRequest):
    """Creates or retrieves a user and initialises their skill profile."""
    _users[req.user_id] = req.name
    db.ensure_user(req.user_id, req.name)
    db.get_or_create_profile(req.user_id)
    return UserResponse(user_id=req.user_id, name=req.name)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str):
    if user_id not in _users:
        raise HTTPException(status_code=404, detail="User not found.")
    return UserResponse(user_id=user_id, name=_users[user_id])
