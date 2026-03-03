"""런타임 모드 전환 테스트."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_reports_retired_chat_runtime(client: AsyncClient):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["version"] == "2.0.0"
    assert data["services"]["chat_runtime"] == "retired"


@pytest.mark.asyncio
async def test_runtime_endpoint_reports_desktop_mode(client: AsyncClient):
    response = await client.get("/api/v1/runtime")
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "desktop_oauth"
    assert "codex" in data["providers"]
    assert "copilot" in data["providers"]
