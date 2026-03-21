import type {
  CboAnalysisRepository,
  ConfiguredSourceRepository,
  SourceDocumentRepository,
  VaultRepository,
} from "../storage/repositories/index.js";
import type {
  SkillPackDefinition,
  SkillDefinition,
  SourceDefinition,
  SkillExecutionContext,
  SkillExecutionMeta,
  SkillRecommendation,
  SourceReference,
} from "../contracts.js";
import { loadCustomSkills } from "./skillLoaderService.js";
import { domainPackRegistry } from "../domains/index.js";

const MAX_INLINE_SOURCE_CHARS = 12_000;
const MAX_CONFIGURED_SOURCE_TOTAL_CHARS = 12_000;
const MAX_CONFIGURED_SOURCE_DOCUMENTS = 3;
const MAX_CONFIGURED_SOURCE_DOC_CHARS = 4_000;

// 도메인 팩에서 프리셋 스킬 & 스킬 팩 로드
function getPresetSkills(): SkillDefinition[] {
  return domainPackRegistry.getActive().presetSkills;
}
function getSkillPacks(): SkillPackDefinition[] {
  return domainPackRegistry.getActive().skillPacks;
}

const SOURCE_TEMPLATES = {
  "vault-confidential": {
    id: "vault-confidential",
    title: "Confidential Vault",
    description: "현재 Domain Pack의 기밀 운영 지식과 내부 메모를 근거로 사용합니다.",
    kind: "vault",
    classification: "confidential",
    sourceType: "internal_memo",
  },
  "vault-reference": {
    id: "vault-reference",
    title: "Reference Vault",
    description: "현재 Domain Pack의 참조 지식과 표준 문서를 근거로 사용합니다.",
    kind: "vault",
    classification: "reference",
    sourceType: "sap_standard",
  },
  "current-cbo-run": {
    id: "current-cbo-run",
    title: "Current CBO Run",
    description: "최근 CBO 분석 run 또는 선택된 run 상세를 근거로 사용합니다.",
    kind: "run",
    classification: null,
    sourceType: "current_run",
  },
  "local-imported-files": {
    id: "local-imported-files",
    title: "Local Imported Files",
    description: "사용자가 현재 세션에서 선택한 파일이나 추출물을 근거로 사용합니다.",
    kind: "local-file",
    classification: null,
    sourceType: "local_file",
  },
  "workspace-context": {
    id: "workspace-context",
    title: "Workspace Context",
    description: "현재 security mode와 domain pack 설정을 근거로 사용합니다.",
    kind: "workspace",
    classification: "mixed",
    sourceType: "workspace_context",
  },
} as const;

function normalizeSkill(skill: SkillDefinition): SkillDefinition {
  return {
    ...skill,
    requiredSources: [...skill.requiredSources],
    suggestedInputs: [...skill.suggestedInputs],
    domainCodes: [...(skill.domainCodes ?? [])],
  };
}

function mapVaultEntriesToSources(entries: Awaited<ReturnType<VaultRepository["list"]>>): SourceDefinition[] {
  return entries.map((entry) => ({
    id: `vault-entry:${entry.id}`,
    title: entry.title,
    description: entry.excerpt ?? "Vault 항목",
    kind: "vault",
    classification: entry.classification,
    availability: "ready",
    sourceType: entry.sourceType,
    linkedId: entry.id,
  }));
}

function getAllSkills(): SkillDefinition[] {
  const custom = loadCustomSkills();
  const presetIds = new Set(getPresetSkills().map((s) => s.id));
  const deduped = custom.filter((s) => !presetIds.has(s.id));
  return [...getPresetSkills(), ...deduped];
}

export function getSkillDefinition(skillId: string): SkillDefinition | null {
  const all = getAllSkills();
  const skill = all.find((item) => item.id === skillId);
  return skill ? normalizeSkill(skill) : null;
}

export function listCustomSkillDefinitions(): SkillDefinition[] {
  return loadCustomSkills().map(normalizeSkill);
}

export class SkillSourceRegistry {
  constructor(
    private readonly vaultRepo: VaultRepository,
    private readonly analysisRepo: CboAnalysisRepository,
    private readonly configuredSourceRepo: ConfiguredSourceRepository,
    private readonly sourceDocumentRepo: SourceDocumentRepository
  ) {}

  listSkills(): SkillDefinition[] {
    return getAllSkills().map(normalizeSkill);
  }

  listPacks(): SkillPackDefinition[] {
    return getSkillPacks().map((pack) => ({
      ...pack,
      skillIds: [...pack.skillIds],
    }));
  }

  recommendSkills(context: SkillExecutionContext): SkillRecommendation[] {
    const compatible = getAllSkills().filter(
      (skill) =>
        skill.supportedDataTypes.includes(context.dataType)
    );

    return compatible.map((skill, index) => ({
      skill: normalizeSkill(skill),
      reason:
        index === 0
          ? "권장되는 기본 작업입니다."
          : "워크스페이스에서 바로 사용할 수 있는 작업입니다.",
      recommendedSourceIds: skill.requiredSources,
    }));
  }

  listSources(context: SkillExecutionContext): SourceDefinition[] {
    const domainEntries = this.vaultRepo.list(20);
    const confidentialCount = domainEntries.filter((entry) => entry.classification === "confidential").length;
    const referenceCount = domainEntries.filter((entry) => entry.classification === "reference").length;
    const configuredLocalSources = this.configuredSourceRepo
      .list("local-folder")
      .map((source) => ({
        id: `configured-source:${source.id}`,
        title: source.title,
        description: source.rootPath ?? "Local Folder source",
        kind: "local-folder" as const,
        classification: source.classificationDefault,
        availability: source.documentCount > 0 ? "ready" as const : "empty" as const,
        sourceType: "local_folder_library" as const,
        configuredSourceId: source.id,
        rootPath: source.rootPath,
        documentCount: source.documentCount,
      }));

    return [
      {
        ...SOURCE_TEMPLATES["workspace-context"],
        availability: "ready",
      },
      {
        ...SOURCE_TEMPLATES["vault-confidential"],
        availability: confidentialCount > 0 ? "ready" : "empty",
      },
      {
        ...SOURCE_TEMPLATES["vault-reference"],
        availability: referenceCount > 0 ? "ready" : "empty",
      },
      {
        ...SOURCE_TEMPLATES["current-cbo-run"],
        availability: context.caseContext?.runId ? "ready" : "unavailable",
      },
      {
        ...SOURCE_TEMPLATES["local-imported-files"],
        availability: context.caseContext?.filePath ? "ready" : "unavailable",
      },
      ...configuredLocalSources,
    ];
  }

  searchSources(query: string, context: SkillExecutionContext): SourceDefinition[] {
    const keyword = query.trim().toLowerCase();
    const baseSources = this.listSources(context);
    const domainEntries = this.vaultRepo
      .list(50)
      .filter((entry) => {
        if (!keyword) return true;
        const haystack = `${entry.title} ${entry.excerpt ?? ""}`.toLowerCase();
        return haystack.includes(keyword);
      });

    return [
      ...baseSources.filter((source) => {
        if (!keyword) return true;
        const haystack = `${source.title} ${source.description}`.toLowerCase();
        return haystack.includes(keyword);
      }),
      ...mapVaultEntriesToSources(domainEntries),
    ];
  }

  resolveSkillExecution(input: {
    skillId?: string;
    sourceIds?: string[];
    context: SkillExecutionContext;
  }): {
    skill: SkillDefinition;
    selectedSources: SourceDefinition[];
    promptContext: string[];
    meta: SkillExecutionMeta;
  } {
    const recommendedSkills = this.recommendSkills(input.context);
    const selectedSkill =
      (input.skillId ? getSkillDefinition(input.skillId) : null) ??
      recommendedSkills[0]?.skill ??
      normalizeSkill(getPresetSkills()[0]);

    const availableSources = this.listSources(input.context);
    const requestedIds =
      input.sourceIds && input.sourceIds.length > 0
        ? input.sourceIds
        : selectedSkill.requiredSources;
    const selectedSources = availableSources.filter(
      (source) =>
        requestedIds.includes(source.id) && source.availability !== "unavailable"
    );

    const sourceReferences: SourceReference[] = [
      {
        id: "workspace-context",
        title: "워크스페이스",
        category: "workspace",
        relevance_score: 1,
        description: "현재 워크스페이스 설정",
      },
    ];

    const promptContext = [
      `[선택 Skill]\n${selectedSkill.title}\n${selectedSkill.description}`,
      `[워크스페이스]\n현재 세션 컨텍스트`,
    ];

    for (const source of selectedSources) {
      if (source.id === "vault-confidential" || source.id === "vault-reference") {
        const domainEntries = this.vaultRepo.list(5);
        const filteredEntries = domainEntries.filter((entry) =>
          source.id === "vault-confidential"
            ? entry.classification === "confidential"
            : entry.classification === "reference"
        );
        if (filteredEntries.length > 0) {
          promptContext.push(
            `[근거 Source: ${source.title}]\n${filteredEntries
              .map((entry) => `- ${entry.title}: ${entry.excerpt ?? "요약 없음"}`)
              .join("\n")}`
          );
          sourceReferences.push(
            ...filteredEntries.map((entry, index) => ({
              id: entry.id,
              title: entry.title,
              category: source.id,
              relevance_score: Math.max(0.5, 0.95 - index * 0.1),
              description: entry.excerpt,
            }))
          );
        } else {
          sourceReferences.push({
            id: source.id,
            title: source.title,
            category: source.id,
            relevance_score: 0.4,
            description: "현재 Domain Pack에 저장된 항목이 없습니다.",
          });
        }
      } else if (source.id.startsWith("vault-entry:") && source.linkedId) {
        const entry = this.vaultRepo.getById(source.linkedId);
        if (entry) {
          promptContext.push(
            `[근거 Source: ${entry.title}]\n${entry.excerpt ?? "요약 없음"}`
          );
          sourceReferences.push({
            id: entry.id,
            title: entry.title,
            category: "vault-entry",
            relevance_score: 0.92,
            description: entry.excerpt,
          });
        }
      } else if (source.id === "current-cbo-run" && input.context.caseContext?.runId) {
        const detail = this.analysisRepo.getRunDetail(input.context.caseContext.runId, 3);
        if (detail?.files.length) {
          promptContext.push(
            `[근거 Source: ${source.title}]\n${detail.files
              .filter((file) => file.result)
              .map((file) => `- ${file.fileName}: ${file.result?.summary ?? "분석 결과 없음"}`)
              .join("\n")}`
          );
          sourceReferences.push(
            ...detail.files.slice(0, 3).map((file, index) => ({
              id: file.id,
              title: file.fileName,
              category: "current-cbo-run",
              relevance_score: Math.max(0.6, 0.9 - index * 0.1),
              description: file.result?.summary ?? file.errorMessage ?? "분석 상세",
            }))
          );
        }
      } else if (source.id === "local-imported-files" && input.context.caseContext?.filePath) {
        const sourceContent = input.context.caseContext.sourceContent?.trim();
        if (sourceContent) {
          promptContext.push(
            buildInlineSourceContext(
              source.title,
              input.context.caseContext.filePath,
              sourceContent
            )
          );
        }
        sourceReferences.push({
          id: source.id,
          title: input.context.caseContext.filePath.split(/[\\/]/).pop() ?? source.title,
          category: "local-file",
          relevance_score: 0.88,
          description: sourceContent
            ? `${input.context.caseContext.filePath} (원문 포함)`
            : input.context.caseContext.filePath,
        });
      } else if (source.id.startsWith("configured-source:") && source.configuredSourceId) {
        const documents = this.sourceDocumentRepo.search({
          sourceId: source.configuredSourceId,
          limit: 10,
        });
        if (documents.length > 0) {
          const contextualDocuments = rankDocumentsForMessage(documents, input.context.message)
            .slice(0, MAX_CONFIGURED_SOURCE_DOCUMENTS);
          promptContext.push(
            buildConfiguredSourceContext(source.title, contextualDocuments)
          );
          sourceReferences.push(
            ...contextualDocuments.map((document, index) => ({
              id: document.id,
              title: document.title,
              category: "configured-source",
              relevance_score: Math.max(0.6, 0.9 - index * 0.1),
              description: `${document.relativePath} (원문 포함)`,
            }))
          );
        } else {
          sourceReferences.push({
            id: source.id,
            title: source.title,
            category: "configured-source",
            relevance_score: 0.45,
            description: "색인된 문서가 없습니다.",
          });
        }
      }
    }

    const uniqueSourceRefs = dedupeSources(sourceReferences);
    return {
      skill: selectedSkill,
      selectedSources,
      promptContext,
      meta: {
        skillUsed: selectedSkill.id,
        skillTitle: selectedSkill.title,
        sources: uniqueSourceRefs,
        sourceIds: selectedSources.map((source) => source.id),
        sourceCount: uniqueSourceRefs.length,
        suggestedTcodes: selectedSkill.domainCodes ?? [],
      },
    };
  }
}

function dedupeSources(entries: SourceReference[]): SourceReference[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = entry.id ?? `${entry.category}:${entry.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}


function buildInlineSourceContext(title: string, filePath: string | undefined, sourceContent: string): string {
  const heading = [`[근거 Source: ${title}]`];
  if (filePath) {
    heading.push(`[파일] ${filePath}`);
  }
  heading.push(truncateForPrompt(sourceContent, MAX_INLINE_SOURCE_CHARS));
  return heading.join("\n");
}

function buildConfiguredSourceContext(title: string, documents: Array<{ relativePath: string; contentText: string }>): string {
  const sections = [`[근거 Source: ${title}]`];
  let remaining = MAX_CONFIGURED_SOURCE_TOTAL_CHARS;

  for (const document of documents) {
    if (remaining <= 0) break;
    const snippet = truncateForPrompt(
      document.contentText,
      Math.min(MAX_CONFIGURED_SOURCE_DOC_CHARS, remaining)
    );
    sections.push(`[문서] ${document.relativePath}\n${snippet}`);
    remaining -= snippet.length;
  }

  return sections.join("\n\n");
}

function truncateForPrompt(content: string, maxChars: number): string {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars).trim()}\n... (생략)`;
}

function rankDocumentsForMessage<T extends { title: string; relativePath: string; excerpt: string | null; contentText: string }>(
  documents: T[],
  message?: string
): T[] {
  const tokens = extractSearchTokens(message);
  if (tokens.length === 0) {
    return documents;
  }

  return [...documents].sort((left, right) => {
    const scoreDiff = scoreDocument(right, tokens) - scoreDocument(left, tokens);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return 0;
  });
}

function extractSearchTokens(message?: string): string[] {
  if (!message) return [];
  const tokens = message
    .toLowerCase()
    .split(/[^a-z0-9가-힣_]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  return [...new Set(tokens)];
}

function scoreDocument(
  document: { title: string; relativePath: string; excerpt: string | null; contentText: string },
  tokens: string[]
): number {
  const haystack = [
    document.title,
    document.relativePath,
    document.excerpt ?? "",
    document.contentText.slice(0, 8_000),
  ].join(" ").toLowerCase();

  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}
