"""BaseSkill 추상 클래스 — 모든 도메인 스킬의 공통 인터페이스."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass(frozen=True)
class SkillMetadata:
    """스킬의 메타데이터."""

    name: str
    description: str
    category: str
    keywords: list[str] = field(default_factory=list)
    suggested_tcodes: list[str] = field(default_factory=list)


class BaseSkill(ABC):
    """도메인 스킬 추상 베이스 클래스."""

    @property
    @abstractmethod
    def metadata(self) -> SkillMetadata:
        """스킬 메타데이터를 반환한다."""

    @property
    def system_prompt(self) -> str:
        """스킬별 LLM 시스템 프롬프트를 반환한다."""
        return self._get_system_prompt()

    @abstractmethod
    def _get_system_prompt(self) -> str:
        """스킬 전용 시스템 프롬프트를 구성한다."""

    def matches(self, query: str) -> float:
        """질문과의 매칭 점수를 반환한다 (0.0~1.0)."""
        query_lower = query.lower()
        matched = sum(
            1 for kw in self.metadata.keywords if kw.lower() in query_lower
        )
        if matched == 0:
            return 0.0
        # 최대 1.0, 키워드 3개 이상 매칭이면 0.9+
        return min(1.0, 0.3 + matched * 0.2)
