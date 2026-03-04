"""RAG 엔진 테스트 — 유틸리티 함수 및 벡터 검색 로직 검증."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.rag_engine import (
    _build_document_text,
    extract_tcodes_from_text,
    search_knowledge,
    index_knowledge_item,
    initialize_vector_store,
)


def test_build_document_text_full():
    """모든 필드가 포함된 문서 텍스트 생성."""
    text = _build_document_text(
        title="덤프 분석",
        category="오류분석",
        tcode="ST22",
        content="ABAP 런타임 에러를 분석합니다.",
        steps=["ST22 실행", "날짜 선택", "에러 확인"],
        warnings=["보존 기간 주의"],
        tags=["덤프", "디버깅"],
    )

    assert "제목: 덤프 분석" in text
    assert "카테고리: 오류분석" in text
    assert "T-code: ST22" in text
    assert "ABAP 런타임 에러" in text
    assert "1. ST22 실행" in text
    assert "보존 기간 주의" in text
    assert "덤프, 디버깅" in text


def test_build_document_text_minimal():
    """최소 필드만으로 문서 텍스트 생성."""
    text = _build_document_text(
        title="테스트",
        category="기타",
        tcode=None,
        content="내용",
        steps=[],
        warnings=[],
        tags=[],
    )

    assert "제목: 테스트" in text
    assert "T-code" not in text
    assert "실행 절차" not in text


def test_build_document_text_with_program():
    """프로그램명과 소스코드 유형이 포함된 문서 텍스트 생성."""
    text = _build_document_text(
        title="ZFIR0090 에러 분석",
        category="오류분석",
        tcode="SE38",
        content="ZFIR0090 프로그램의 런타임 에러를 분석합니다.",
        steps=["SE38에서 프로그램 열기", "디버깅 실행"],
        warnings=["운영계에서 직접 수정 금지"],
        tags=["ABAP", "디버깅"],
        program_name="ZFIR0090",
        source_type="source_code",
    )

    assert "프로그램명: ZFIR0090" in text
    assert "유형: 소스코드 분석" in text
    assert "T-code: SE38" in text


def test_build_document_text_guide_no_type_label():
    """guide 유형은 유형 레이블을 표시하지 않는다."""
    text = _build_document_text(
        title="일반 가이드",
        category="데이터분석",
        tcode=None,
        content="일반 내용",
        steps=[],
        warnings=[],
        tags=[],
        source_type="guide",
    )

    assert "유형:" not in text


def test_extract_tcodes_basic():
    """텍스트에서 SAP T-code를 정확히 추출."""
    text = "ST22로 덤프를 분석하고 SM21에서 시스템 로그를 확인하세요."
    tcodes = extract_tcodes_from_text(text)
    assert "ST22" in tcodes
    assert "SM21" in tcodes


def test_extract_tcodes_various_patterns():
    """다양한 패턴의 T-code 추출."""
    text = "SE38에서 프로그램을 실행하고, STMS로 전송합니다. SCU3도 확인하세요."
    tcodes = extract_tcodes_from_text(text)
    assert "SE38" in tcodes
    assert "STMS" in tcodes
    assert "SCU3" in tcodes


def test_extract_tcodes_no_duplicates():
    """중복 T-code 제거 확인."""
    text = "ST22를 실행합니다. ST22에서 결과를 확인합니다."
    tcodes = extract_tcodes_from_text(text)
    assert tcodes.count("ST22") == 1


def test_extract_tcodes_empty():
    """T-code가 없는 텍스트."""
    text = "일반적인 텍스트입니다."
    tcodes = extract_tcodes_from_text(text)
    assert tcodes == []


# ── 벡터 검색 통합 테스트 ──

@pytest.mark.asyncio
async def test_search_knowledge_empty_collection():
    """빈 컬렉션에서 검색 시 빈 결과 반환."""
    with patch("app.core.rag_engine.get_collection") as mock_get_collection:
        mock_collection = MagicMock()
        mock_collection.count.return_value = 0
        mock_get_collection.return_value = mock_collection

        results = await search_knowledge("ST22")
        assert results == []


@pytest.mark.asyncio
async def test_search_knowledge_with_results():
    """벡터 검색 결과 반환 검증."""
    with patch("app.core.rag_engine.get_collection") as mock_get_collection, \
         patch("app.core.rag_engine.generate_embedding") as mock_embedding:
        mock_collection = MagicMock()
        mock_collection.count.return_value = 1
        mock_collection.query.return_value = {
            "ids": [["seed_0"]],
            "documents": [["덤프 분석 문서"]],
            "metadatas": [[{
                "title": "ST22로 덤프 분석",
                "category": "오류분석",
                "tcode": "ST22",
            }]],
            "distances": [[0.5]],
        }
        mock_get_collection.return_value = mock_collection
        mock_embedding.return_value = [0.1, 0.2, 0.3]

        results = await search_knowledge("ST22 덤프", top_k=5)
        assert len(results) == 1
        assert results[0]["title"] == "ST22로 덤프 분석"
        assert results[0]["id"] == "seed_0"
        assert results[0]["relevance_score"] > 0.0


@pytest.mark.asyncio
async def test_search_knowledge_with_category_filter():
    """카테고리 필터를 적용한 검색."""
    with patch("app.core.rag_engine.get_collection") as mock_get_collection, \
         patch("app.core.rag_engine.generate_embedding") as mock_embedding:
        mock_collection = MagicMock()
        mock_collection.count.return_value = 2
        mock_collection.query.return_value = {
            "ids": [["seed_1"]],
            "documents": [["데이터 분석 문서"]],
            "metadatas": [[{
                "title": "데이터 분석 가이드",
                "category": "데이터분석",
                "tcode": "SE38",
            }]],
            "distances": [[0.3]],
        }
        mock_get_collection.return_value = mock_collection
        mock_embedding.return_value = [0.2, 0.3, 0.4]

        results = await search_knowledge("데이터", category="데이터분석", top_k=5)
        assert len(results) == 1
        assert results[0]["category"] == "데이터분석"


@pytest.mark.asyncio
async def test_index_knowledge_item():
    """지식 항목 벡터 인덱싱."""
    with patch("app.core.rag_engine.get_collection") as mock_get_collection, \
         patch("app.core.rag_engine.generate_embedding") as mock_embedding:
        mock_collection = MagicMock()
        mock_get_collection.return_value = mock_collection
        mock_embedding.return_value = [0.1, 0.2, 0.3]

        await index_knowledge_item(
            item_id="test_123",
            title="테스트 항목",
            category="테스트",
            tcode="ST22",
            content="테스트 내용",
            steps=["1단계", "2단계"],
            warnings=["주의"],
            tags=["테스트"],
        )

        mock_embedding.assert_called_once()
        mock_collection.upsert.assert_called_once()
        call_args = mock_collection.upsert.call_args
        assert call_args[1]["ids"] == ["test_123"]
        assert call_args[1]["embeddings"] == [[0.1, 0.2, 0.3]]


@pytest.mark.asyncio
async def test_initialize_vector_store_logs_on_failure():
    """벡터 스토어 초기화 중 일부 실패 시 로깅 검증."""
    test_data = [
        {
            "title": "항목 1",
            "category": "카테고리",
            "tcode": "ST22",
            "content": "내용 1",
            "steps": [],
            "warnings": [],
            "tags": [],
        },
        {
            "title": "항목 2",
            "category": "카테고리",
            "tcode": "SE38",
            "content": "내용 2",
            "steps": [],
            "warnings": [],
            "tags": [],
        },
    ]

    with patch("app.core.rag_engine.get_collection") as mock_get_collection, \
         patch("app.core.rag_engine.generate_embedding") as mock_embedding, \
         patch("builtins.open", create=True) as mock_open, \
         patch("json.load") as mock_json_load, \
         patch("app.core.rag_engine.logger") as mock_logger:

        mock_collection = MagicMock()
        mock_collection.count.return_value = 0
        mock_get_collection.return_value = mock_collection

        # 첫 번째는 성공, 두 번째는 실패
        mock_embedding.side_effect = [
            [0.1, 0.2, 0.3],
            Exception("Embedding 생성 실패"),
        ]

        mock_json_load.side_effect = [test_data, []]  # seed_data 로드, error_patterns 없음

        indexed = await initialize_vector_store()

        # 검증: 1개 성공, 1개 실패
        assert indexed == 1
        mock_logger.warning.assert_called()


@pytest.mark.asyncio
async def test_initialize_vector_store_all_success():
    """벡터 스토어 초기화 성공 시나리오."""
    test_data = [
        {
            "title": "항목 1",
            "category": "카테고리",
            "tcode": "ST22",
            "content": "내용",
            "steps": [],
            "warnings": [],
            "tags": [],
        },
    ]

    with patch("app.core.rag_engine.get_collection") as mock_get_collection, \
         patch("app.core.rag_engine.generate_embedding") as mock_embedding, \
         patch("builtins.open", create=True) as mock_open, \
         patch("json.load") as mock_json_load:

        mock_collection = MagicMock()
        mock_collection.count.return_value = 0
        mock_get_collection.return_value = mock_collection
        mock_embedding.return_value = [0.1, 0.2, 0.3]
        mock_json_load.side_effect = [test_data, []]

        indexed = await initialize_vector_store()

        assert indexed == 1
        mock_collection.upsert.assert_called_once()
