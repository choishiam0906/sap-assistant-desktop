"""에러 패턴 카탈로그 테스트 — 에러 필드 검색/생성/문서 텍스트 검증."""

import json
from pathlib import Path

import pytest
from httpx import AsyncClient

from app.core.rag_engine import _build_document_text

# ── 문서 텍스트 생성 테스트 ──────────────────────────

def test_build_document_text_with_error_fields():
    """에러 패턴 필드가 포함된 문서 텍스트 생성."""
    text = _build_document_text(
        title="DBIF_RSQL_SQL_ERROR — DB SQL 에러",
        category="오류분석",
        tcode="ST22",
        content="SQL 실행 에러입니다.",
        steps=["ST22에서 확인"],
        warnings=["DB Lock 주의"],
        tags=["DB에러"],
        source_type="error_pattern",
        error_code="DBIF_RSQL_SQL_ERROR",
        sap_note="2220064",
        solutions=["SM12에서 잠금 해제", "인덱스 생성"],
    )

    assert "에러코드: DBIF_RSQL_SQL_ERROR" in text
    assert "SAP 노트: 2220064" in text
    assert "유형: 에러 패턴" in text
    assert "해결방법:" in text
    assert "1. SM12에서 잠금 해제" in text
    assert "2. 인덱스 생성" in text


def test_build_document_text_error_without_sap_note():
    """SAP Note가 없는 에러 패턴 문서 텍스트."""
    text = _build_document_text(
        title="TSV_TNEW_PAGE_ALLOC_FAILED",
        category="오류분석",
        tcode="ST22",
        content="메모리 부족 에러",
        steps=[],
        warnings=[],
        tags=[],
        source_type="error_pattern",
        error_code="TSV_TNEW_PAGE_ALLOC_FAILED",
        sap_note=None,
        solutions=["메모리 파라미터 조정"],
    )

    assert "에러코드: TSV_TNEW_PAGE_ALLOC_FAILED" in text
    assert "SAP 노트" not in text
    assert "1. 메모리 파라미터 조정" in text


def test_build_document_text_no_solutions():
    """solutions가 비어있거나 None인 경우."""
    text = _build_document_text(
        title="테스트 에러",
        category="오류분석",
        tcode=None,
        content="내용",
        steps=[],
        warnings=[],
        tags=[],
        error_code="TEST_ERROR",
        solutions=None,
    )

    assert "에러코드: TEST_ERROR" in text
    assert "해결방법" not in text


# ── 시드 데이터 구조 검증 ──────────────────────────

def test_error_patterns_json_structure():
    """error_patterns.json 파일 구조 검증."""
    path = Path(__file__).parent.parent / "app" / "data" / "sap_knowledge" / "error_patterns.json"
    with open(path, encoding="utf-8") as f:
        patterns = json.load(f)

    assert len(patterns) >= 10

    required_fields = {"title", "category", "content", "source_type", "error_code"}
    for pattern in patterns:
        for field in required_fields:
            assert field in pattern, f"'{field}' 필드 누락: {pattern.get('title', '?')}"
        assert pattern["source_type"] == "error_pattern"
        assert pattern["category"] == "오류분석"


def test_error_patterns_unique_error_codes():
    """에러 코드가 중복되지 않는지 확인."""
    path = Path(__file__).parent.parent / "app" / "data" / "sap_knowledge" / "error_patterns.json"
    with open(path, encoding="utf-8") as f:
        patterns = json.load(f)

    error_codes = [p["error_code"] for p in patterns]
    assert len(error_codes) == len(set(error_codes)), "중복 에러 코드 존재"


# ── API 통합 테스트 ──────────────────────────────

@pytest.mark.asyncio
async def test_create_error_pattern_knowledge(client: AsyncClient):
    """에러 패턴 지식 항목 생성 및 조회."""
    payload = {
        "title": "DBIF_RSQL_SQL_ERROR — DB SQL 에러",
        "category": "오류분석",
        "tcode": "ST22",
        "source_type": "error_pattern",
        "error_code": "DBIF_RSQL_SQL_ERROR",
        "sap_note": "2220064",
        "content": "SQL 실행 에러입니다.",
        "solutions": ["SM12에서 잠금 해제", "인덱스 생성"],
        "tags": ["DB에러", "SQL에러"],
    }

    response = await client.post("/api/v1/knowledge", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["error_code"] == "DBIF_RSQL_SQL_ERROR"
    assert data["sap_note"] == "2220064"
    assert data["solutions"] == ["SM12에서 잠금 해제", "인덱스 생성"]
    assert data["source_type"] == "error_pattern"

    # 조회
    item_id = data["id"]
    get_resp = await client.get(f"/api/v1/knowledge/{item_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["error_code"] == "DBIF_RSQL_SQL_ERROR"


@pytest.mark.asyncio
async def test_update_error_pattern_fields(client: AsyncClient):
    """에러 패턴 필드 수정."""
    # 생성
    payload = {
        "title": "TIME_OUT 에러",
        "category": "오류분석",
        "content": "타임아웃 에러",
        "source_type": "error_pattern",
        "error_code": "TIME_OUT",
    }
    create_resp = await client.post("/api/v1/knowledge", json=payload)
    item_id = create_resp.json()["id"]

    # sap_note 추가, solutions 추가
    update_payload = {
        "sap_note": "1234567",
        "solutions": ["백그라운드 잡 전환", "WHERE 조건 추가"],
    }
    response = await client.put(f"/api/v1/knowledge/{item_id}", json=update_payload)
    assert response.status_code == 200
    assert response.json()["sap_note"] == "1234567"
    assert len(response.json()["solutions"]) == 2
