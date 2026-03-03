"""Chat API 테스트 — 서버형 채팅 종료 동작 검증."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_chat_endpoint_returns_gone(client: AsyncClient):
    """채팅 엔드포인트가 410 Gone을 반환하는지 검증."""
    response = await client.post("/api/v1/chat", json={
        "message": "ST22로 덤프 분석하는 방법 알려줘",
    })

    assert response.status_code == 410
    data = response.json()
    assert "desktop client" in data["detail"]


@pytest.mark.asyncio
async def test_chat_with_session_id_still_returns_gone(client: AsyncClient):
    """세션 ID를 포함해도 서버형 채팅은 종료 상태를 유지한다."""
    response = await client.post("/api/v1/chat", json={
        "message": "테스트 질문",
        "session_id": "test-session-123",
    })

    assert response.status_code == 410


@pytest.mark.asyncio
async def test_chat_empty_message(client: AsyncClient):
    """빈 메시지 요청 시 기존 입력 검증(422)을 유지한다."""
    response = await client.post("/api/v1/chat", json={
        "message": "",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_copilot_endpoint_returns_gone(client: AsyncClient):
    """Copilot 엔드포인트도 서버 런타임 종료(410) 상태다."""
    response = await client.post("/api/v1/chat/copilot", json={
        "text": "SAP 질문",
    })
    assert response.status_code == 410
