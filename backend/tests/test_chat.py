"""Chat API 테스트 — 엔드포인트 구조 검증 (LLM 호출 모킹)."""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
@patch("app.api.chat.generate_rag_response")
async def test_chat_endpoint(mock_rag: AsyncMock, client: AsyncClient):
    """채팅 엔드포인트가 올바른 응답 구조를 반환하는지 검증."""
    mock_rag.return_value = {
        "answer": "ST22는 ABAP Runtime Error를 분석하는 T-code입니다.",
        "sources": [
            {"title": "덤프분석 가이드", "category": "오류분석", "relevance_score": 0.95}
        ],
        "suggested_tcodes": ["ST22", "SM21"],
    }

    response = await client.post("/api/v1/chat", json={
        "message": "ST22로 덤프 분석하는 방법 알려줘",
    })

    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "ST22" in data["answer"]
    assert data["suggested_tcodes"] == ["ST22", "SM21"]
    assert len(data["sources"]) == 1
    assert "session_id" in data


@pytest.mark.asyncio
@patch("app.api.chat.generate_rag_response")
async def test_chat_creates_session(mock_rag: AsyncMock, client: AsyncClient):
    """세션 ID 없이 요청 시 새 세션이 생성되는지 검증."""
    mock_rag.return_value = {
        "answer": "응답",
        "sources": [],
        "suggested_tcodes": [],
    }

    response = await client.post("/api/v1/chat", json={
        "message": "테스트 질문",
    })

    data = response.json()
    assert data["session_id"]  # 비어있지 않은 세션 ID


@pytest.mark.asyncio
@patch("app.api.chat.generate_rag_response")
async def test_chat_reuses_session(mock_rag: AsyncMock, client: AsyncClient):
    """기존 세션 ID를 전달하면 동일 세션 ID가 반환되는지 검증."""
    mock_rag.return_value = {
        "answer": "응답",
        "sources": [],
        "suggested_tcodes": [],
    }

    response = await client.post("/api/v1/chat", json={
        "message": "테스트 질문",
        "session_id": "test-session-123",
    })

    data = response.json()
    assert data["session_id"] == "test-session-123"


@pytest.mark.asyncio
async def test_chat_empty_message(client: AsyncClient):
    """빈 메시지 요청 시 422 반환."""
    response = await client.post("/api/v1/chat", json={
        "message": "",
    })
    assert response.status_code == 422
