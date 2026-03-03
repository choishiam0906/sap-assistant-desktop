"""채팅 API — 서버형 채팅 경로 종료 안내."""

from fastapi import APIRouter, HTTPException

from app.models.schemas import ChatRequest

router = APIRouter(prefix="/chat", tags=["Chat"])

CHAT_RUNTIME_GONE_DETAIL = (
    "Server-side chat runtime has been retired. "
    "Use the desktop client with user OAuth (Codex/Copilot)."
)

@router.post("")
async def chat(_: ChatRequest) -> None:
    """서버형 채팅 경로 종료."""
    raise HTTPException(status_code=410, detail=CHAT_RUNTIME_GONE_DETAIL)


@router.get("/skills")
async def list_skills() -> list[dict]:
    """사용 가능한 스킬 목록을 반환한다."""
    from app.core.skills import get_skill_registry

    registry = get_skill_registry()
    return registry.list_skills()
