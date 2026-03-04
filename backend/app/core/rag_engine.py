"""RAG 파이프라인 — ChromaDB 벡터 검색 + LLM 응답 생성."""

import json
import logging
import re
from pathlib import Path

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import settings
from app.core.llm_client import generate_chat_response, generate_embedding

logger = logging.getLogger(__name__)

SEED_DATA_PATH = Path(__file__).parent.parent / "data" / "sap_knowledge" / "seed_data.json"
ERROR_PATTERNS_PATH = (
    Path(__file__).parent.parent / "data" / "sap_knowledge" / "error_patterns.json"
)

# ChromaDB 클라이언트 (싱글턴)
_chroma_client: chromadb.ClientAPI | None = None
_collection: chromadb.Collection | None = None

COLLECTION_NAME = "sap_knowledge"


def get_chroma_client() -> chromadb.ClientAPI:
    """ChromaDB 클라이언트를 반환한다."""
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _chroma_client


def get_collection() -> chromadb.Collection:
    """SAP 지식 벡터 컬렉션을 반환한다."""
    global _collection
    if _collection is None:
        client = get_chroma_client()
        _collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"description": "SAP 운영 지식 벡터 스토어"},
        )
    return _collection


async def index_knowledge_item(
    item_id: str,
    title: str,
    category: str,
    tcode: str | None,
    content: str,
    steps: list[str],
    warnings: list[str],
    tags: list[str],
    program_name: str | None = None,
    source_type: str = "guide",
    error_code: str | None = None,
    sap_note: str | None = None,
    solutions: list[str] | None = None,
) -> None:
    """지식 항목을 ChromaDB에 벡터 인덱싱한다."""
    # 검색 품질을 위해 모든 필드를 하나의 텍스트로 결합
    full_text = _build_document_text(
        title, category, tcode, content, steps, warnings, tags,
        program_name=program_name, source_type=source_type,
        error_code=error_code, sap_note=sap_note, solutions=solutions,
    )

    embedding = await generate_embedding(full_text)

    collection = get_collection()
    collection.upsert(
        ids=[item_id],
        embeddings=[embedding],
        documents=[full_text],
        metadatas=[{
            "title": title,
            "category": category,
            "tcode": tcode or "",
            "program_name": program_name or "",
            "source_type": source_type,
            "error_code": error_code or "",
            "sap_note": sap_note or "",
            "tags": json.dumps(tags, ensure_ascii=False),
        }],
    )


def _build_document_text(
    title: str,
    category: str,
    tcode: str | None,
    content: str,
    steps: list[str],
    warnings: list[str],
    tags: list[str],
    program_name: str | None = None,
    source_type: str = "guide",
    error_code: str | None = None,
    sap_note: str | None = None,
    solutions: list[str] | None = None,
) -> str:
    """인덱싱/검색용 통합 문서 텍스트를 생성한다."""
    source_labels = {
        "guide": "운영 가이드",
        "source_code": "소스코드 분석",
        "error_pattern": "에러 패턴",
    }
    parts = [f"제목: {title}", f"카테고리: {category}"]
    if source_type != "guide":
        parts.append(f"유형: {source_labels.get(source_type, source_type)}")
    if tcode:
        parts.append(f"T-code: {tcode}")
    if program_name:
        parts.append(f"프로그램명: {program_name}")
    if error_code:
        parts.append(f"에러코드: {error_code}")
    if sap_note:
        parts.append(f"SAP 노트: {sap_note}")
    parts.append(f"내용: {content}")
    if steps:
        parts.append("실행 절차:\n" + "\n".join(f"  {i+1}. {s}" for i, s in enumerate(steps)))
    if warnings:
        parts.append("주의사항:\n" + "\n".join(f"  - {w}" for w in warnings))
    if solutions:
        parts.append("해결방법:\n" + "\n".join(f"  {i+1}. {s}" for i, s in enumerate(solutions)))
    if tags:
        parts.append(f"태그: {', '.join(tags)}")
    return "\n\n".join(parts)


async def search_knowledge(
    query: str,
    top_k: int = 5,
    category: str | None = None,
    source_type: str | None = None,
) -> list[dict]:
    """사용자 질문과 유사한 지식을 벡터 검색한다."""
    collection = get_collection()

    # 컬렉션이 비어있으면 빈 결과 반환
    if collection.count() == 0:
        return []

    query_embedding = await generate_embedding(query)

    # ChromaDB $and 조건으로 다중 필터 지원
    where_filter = None
    filters = []
    if category:
        filters.append({"category": category})
    if source_type:
        filters.append({"source_type": source_type})
    if len(filters) == 1:
        where_filter = filters[0]
    elif len(filters) > 1:
        where_filter = {"$and": filters}

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count()),
        where=where_filter,
        include=["documents", "metadatas", "distances"],
    )

    search_results = []
    if results["ids"] and results["ids"][0]:
        for i, doc_id in enumerate(results["ids"][0]):
            metadata = results["metadatas"][0][i] if results["metadatas"] else {}
            distance = results["distances"][0][i] if results["distances"] else 0.0
            # ChromaDB distance → relevance score (L2 distance 기준)
            relevance = max(0.0, 1.0 - distance / 2.0)

            search_results.append({
                "id": doc_id,
                "title": metadata.get("title", ""),
                "category": metadata.get("category", ""),
                "tcode": metadata.get("tcode", ""),
                "document": results["documents"][0][i] if results["documents"] else "",
                "relevance_score": round(relevance, 3),
            })

    return search_results


async def generate_rag_response(
    user_message: str,
    chat_history: list[dict[str, str]] | None = None,
    category: str | None = None,
) -> dict:
    """RAG 파이프라인: 스킬 선택 → 벡터 검색 → 컨텍스트 구성 → LLM 응답."""
    from app.core.skills import get_skill_registry

    # 1. 스킬 선택
    registry = get_skill_registry()
    selected_skill = registry.select_skill(user_message)

    # 2. 벡터 검색 (스킬 카테고리로 우선 필터, 없으면 전체 검색)
    skill_category = selected_skill.metadata.category or None
    search_results = await search_knowledge(
        user_message,
        top_k=5,
        category=category or skill_category,
    )

    # 3. 컨텍스트 구성
    context_parts = []
    sources = []
    suggested_tcodes = list(selected_skill.metadata.suggested_tcodes)

    for result in search_results:
        if result["relevance_score"] > 0.3:  # 관련성 임계값
            context_parts.append(result["document"])
            sources.append({
                "title": result["title"],
                "category": result["category"],
                "relevance_score": result["relevance_score"],
            })
            if result["tcode"] and result["tcode"] not in suggested_tcodes:
                suggested_tcodes.append(result["tcode"])

    context = (
        "\n\n---\n\n".join(context_parts)
        if context_parts
        else "관련 자료를 찾지 못했습니다."
    )

    # 4. 스킬별 시스템 프롬프트로 LLM 응답 생성
    answer = await generate_chat_response(
        user_message, context, chat_history,
        system_prompt=selected_skill.system_prompt,
    )

    return {
        "answer": answer,
        "sources": sources,
        "suggested_tcodes": suggested_tcodes,
        "skill_used": selected_skill.metadata.name,
    }


async def initialize_vector_store() -> int:
    """시드 데이터를 ChromaDB에 초기 인덱싱한다."""
    collection = get_collection()

    if collection.count() > 0:
        return 0

    # 시드 데이터 + 에러 패턴 데이터 병합 로드
    all_items = []
    with open(SEED_DATA_PATH, encoding="utf-8") as f:
        all_items.extend(json.load(f))
    if ERROR_PATTERNS_PATH.exists():
        with open(ERROR_PATTERNS_PATH, encoding="utf-8") as f:
            all_items.extend(json.load(f))

    indexed = 0
    failed = 0
    for item in all_items:
        item_id = f"seed_{indexed}"
        full_text = _build_document_text(
            title=item["title"],
            category=item["category"],
            tcode=item.get("tcode"),
            content=item["content"],
            steps=item.get("steps", []),
            warnings=item.get("warnings", []),
            tags=item.get("tags", []),
            source_type=item.get("source_type", "guide"),
            error_code=item.get("error_code"),
            sap_note=item.get("sap_note"),
            solutions=item.get("solutions"),
        )

        try:
            embedding = await generate_embedding(full_text)
            collection.upsert(
                ids=[item_id],
                embeddings=[embedding],
                documents=[full_text],
                metadatas=[{
                    "title": item["title"],
                    "category": item["category"],
                    "tcode": item.get("tcode", ""),
                    "source_type": item.get("source_type", "guide"),
                    "error_code": item.get("error_code", ""),
                    "sap_note": item.get("sap_note", ""),
                    "tags": json.dumps(item.get("tags", []), ensure_ascii=False),
                }],
            )
            indexed += 1
        except Exception as exc:
            logger.warning("벡터 인덱싱 실패 (title=%s): %s", item.get("title", "?"), exc)
            failed += 1
            continue

    if indexed == 0 and len(all_items) > 0:
        logger.error("벡터 스토어 초기화 실패: %d건 중 0건 인덱싱됨", len(all_items))
    elif failed > 0:
        logger.warning("벡터 스토어 초기화 부분 성공: %d건 인덱싱, %d건 실패", indexed, failed)

    return indexed


def remove_from_vector_store(item_id: str) -> None:
    """벡터 스토어에서 항목을 삭제한다."""
    collection = get_collection()
    try:
        collection.delete(ids=[item_id])
    except Exception as exc:
        logger.warning("벡터 스토어 항목 삭제 실패 (id=%s): %s", item_id, exc)


def extract_tcodes_from_text(text: str) -> list[str]:
    """텍스트에서 SAP T-code 패턴을 추출한다."""
    # \b는 한국어 문자 경계에서 작동하지 않으므로 lookbehind/lookahead 사용
    tcode_patterns = (
        r"S[A-Z]\d{2,3}[A-Z]?|SE\d{2}|SM\d{2}|ST\d{2}[A-Z]?"
        r"|SU\d{2}|STMS|PFCG|RSM\d{2}|SCU\d|RZ\d{2}"
    )
    pattern = rf"(?<![A-Z0-9])({tcode_patterns})(?![A-Z0-9])"
    matches = re.findall(pattern, text.upper())
    return list(dict.fromkeys(matches))  # 중복 제거, 순서 유지
