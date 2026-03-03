"""Copilot Studio 연동 API — 서버 경로 종료 안내."""

from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix="/chat", tags=["Copilot Studio"])

COPILOT_RUNTIME_GONE_DETAIL = (
    "Copilot Studio runtime is no longer hosted by this backend. "
    "Use the desktop client with user OAuth."
)


@router.post("/copilot")
async def copilot_chat(request: Request) -> dict:
    """Copilot Studio 서버 경로 종료."""
    _ = request
    raise HTTPException(status_code=410, detail=COPILOT_RUNTIME_GONE_DETAIL)
