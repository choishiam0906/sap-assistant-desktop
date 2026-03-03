"""SkillRegistry — 스킬 등록 및 라우팅 싱글톤."""

from app.core.skills.base import BaseSkill

_registry: "SkillRegistry | None" = None


class SkillRegistry:
    """등록된 스킬 중 사용자 질문에 가장 적합한 스킬을 선택한다."""

    def __init__(self) -> None:
        self.skills: list[BaseSkill] = []

    def register(self, skill: BaseSkill) -> None:
        """스킬을 레지스트리에 등록한다."""
        self.skills.append(skill)

    def select_skill(self, query: str) -> BaseSkill:
        """질문에 가장 적합한 스킬을 선택한다."""
        if not self.skills:
            raise RuntimeError("등록된 스킬이 없습니다")

        scores = [(skill, skill.matches(query)) for skill in self.skills]
        best = max(scores, key=lambda x: x[1])
        return best[0]

    def list_skills(self) -> list[dict]:
        """등록된 스킬 목록을 반환한다."""
        return [
            {
                "name": s.metadata.name,
                "description": s.metadata.description,
                "category": s.metadata.category,
                "suggested_tcodes": s.metadata.suggested_tcodes,
            }
            for s in self.skills
        ]


def get_skill_registry() -> SkillRegistry:
    """SkillRegistry 싱글턴을 반환한다."""
    global _registry
    if _registry is None:
        _registry = SkillRegistry()
        _register_default_skills(_registry)
    return _registry


def _register_default_skills(registry: SkillRegistry) -> None:
    """기본 도메인 스킬을 등록한다."""
    from app.core.skills.auth_management import AuthManagementSkill
    from app.core.skills.cts_management import CTSManagementSkill
    from app.core.skills.data_analysis import DataAnalysisSkill
    from app.core.skills.error_analysis import ErrorAnalysisSkill
    from app.core.skills.general import GeneralSkill

    registry.register(DataAnalysisSkill())
    registry.register(ErrorAnalysisSkill())
    registry.register(AuthManagementSkill())
    registry.register(CTSManagementSkill())
    registry.register(GeneralSkill())  # 폴백은 마지막
