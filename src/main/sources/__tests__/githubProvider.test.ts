import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'

// ── Mocks ──

vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/test-github-provider',
    getName: () => 'sap-knowledge-hub-test',
  },
}))

vi.mock('keytar', () => {
  throw new Error('keytar not available in test')
})

vi.mock('../../logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Repository mocks
const mockSourceRepo = {
  createApiSource: vi.fn(),
  getById: vi.fn(),
  updateSyncStatus: vi.fn(),
  list: vi.fn(),
}

const mockDocumentRepo = {
  listHashesBySource: vi.fn().mockReturnValue([]),
  upsertDocuments: vi.fn(),
  deleteByIds: vi.fn(),
}

// fetch mock
const mockFetch = vi.fn() as Mock
vi.stubGlobal('fetch', mockFetch)

import { GitHubSourceProvider } from '../githubProvider.js'

// ── Helpers ──

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response
}

const REPO_META = {
  default_branch: 'main',
  full_name: 'acme/erp-system',
  private: false,
  description: 'ERP 시스템',
}

const TREE_RESPONSE = {
  sha: 'abc123',
  url: 'https://api.github.com/repos/acme/erp-system/git/trees/main',
  tree: [
    { path: 'src/main.ts', mode: '100644', type: 'blob' as const, sha: 'sha-main-ts', size: 1024, url: '' },
    { path: 'src/utils.py', mode: '100644', type: 'blob' as const, sha: 'sha-utils-py', size: 512, url: '' },
    { path: 'docs/guide.md', mode: '100644', type: 'blob' as const, sha: 'sha-guide-md', size: 256, url: '' },
    { path: 'src/lib', mode: '040000', type: 'tree' as const, sha: 'sha-dir', url: '' },
    { path: 'assets/logo.png', mode: '100644', type: 'blob' as const, sha: 'sha-logo', size: 8192, url: '' },
  ],
  truncated: false,
}

function fileContentResponse(content: string) {
  return jsonResponse({
    content: Buffer.from(content).toString('base64'),
    encoding: 'base64',
    size: content.length,
    name: 'file',
    path: 'file',
  })
}

// ── Tests ──

describe('GitHubSourceProvider', () => {
  let provider: GitHubSourceProvider

  beforeEach(() => {
    vi.clearAllMocks()
    mockDocumentRepo.listHashesBySource.mockReturnValue([])
    provider = new GitHubSourceProvider(
      mockSourceRepo as any,
      mockDocumentRepo as any,
    )
  })

  // ─── parseRepoUrl ───

  describe('parseRepoUrl', () => {
    it('https URL에서 owner/repo를 추출한다', () => {
      const result = provider.parseRepoUrl('https://github.com/acme/erp-system')
      expect(result).toEqual({ owner: 'acme', repo: 'erp-system' })
    })

    it('.git 접미사가 있는 URL을 처리한다', () => {
      const result = provider.parseRepoUrl('https://github.com/acme/erp-system.git')
      expect(result).toEqual({ owner: 'acme', repo: 'erp-system' })
    })

    it('후행 슬래시를 제거한다', () => {
      const result = provider.parseRepoUrl('https://github.com/acme/erp-system/')
      expect(result).toEqual({ owner: 'acme', repo: 'erp-system' })
    })

    it('owner/repo 단축 형식을 지원한다', () => {
      const result = provider.parseRepoUrl('acme/erp-system')
      expect(result).toEqual({ owner: 'acme', repo: 'erp-system' })
    })

    it('올바르지 않은 URL에 에러를 던진다', () => {
      expect(() => provider.parseRepoUrl('not-a-repo')).toThrow('올바른 GitHub 리포지토리 URL')
    })

    it('빈 문자열에 에러를 던진다', () => {
      expect(() => provider.parseRepoUrl('')).toThrow('올바른 GitHub 리포지토리 URL')
    })
  })

  // ─── connectRepo ───

  describe('connectRepo', () => {
    const MOCK_SOURCE = {
      id: 'src-1',
      kind: 'api' as const,
      title: 'acme/erp-system',
      classificationDefault: 'reference',
    }

    beforeEach(() => {
      mockSourceRepo.createApiSource.mockReturnValue(MOCK_SOURCE)
      mockSourceRepo.getById.mockReturnValue(MOCK_SOURCE)
    })

    it('리포지토리를 연결하고 파일을 인덱싱한다', async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse(REPO_META))       // fetchRepoMeta
        .mockResolvedValueOnce(jsonResponse(TREE_RESPONSE))    // fetchTree
        .mockResolvedValueOnce(fileContentResponse('const x = 1'))  // main.ts
        .mockResolvedValueOnce(fileContentResponse('import os'))     // utils.py
        .mockResolvedValueOnce(fileContentResponse('# Guide'))       // guide.md

      const result = await provider.connectRepo({
        repoUrl: 'https://github.com/acme/erp-system',
      })

      expect(result.source).toEqual(MOCK_SOURCE)
      expect(result.summary.indexed).toBe(3)
      expect(result.summary.failed).toBe(0)

      // createApiSource가 올바른 connectionMeta로 호출됨
      expect(mockSourceRepo.createApiSource).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'acme/erp-system',
          connectionMeta: expect.objectContaining({
            provider: 'github',
            owner: 'acme',
            repo: 'erp-system',
            branch: 'main',
          }),
        }),
      )
    })

    it('PAT가 제공되면 Authorization 헤더를 포함한다', async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse(REPO_META))
        .mockResolvedValueOnce(jsonResponse({ ...TREE_RESPONSE, tree: [] }))

      await provider.connectRepo({
        repoUrl: 'acme/erp-system',
        pat: 'ghp_test123',
      })

      // 첫 번째 fetch (repoMeta) 호출의 headers 확인
      const firstCallHeaders = mockFetch.mock.calls[0][1]?.headers as Record<string, string>
      expect(firstCallHeaders.Authorization).toBe('Bearer ghp_test123')
    })

    it('비코드 파일과 디렉토리를 필터링한다', async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse(REPO_META))
        .mockResolvedValueOnce(jsonResponse(TREE_RESPONSE))
        .mockResolvedValueOnce(fileContentResponse('const x = 1'))  // main.ts
        .mockResolvedValueOnce(fileContentResponse('import os'))     // utils.py
        .mockResolvedValueOnce(fileContentResponse('# Guide'))       // guide.md

      await provider.connectRepo({ repoUrl: 'acme/erp-system' })

      // tree = blob 3개 (코드파일) + tree 1개 (디렉토리) + blob 1개 (png)
      // .png는 CODE_EXTENSIONS에 없으므로 필터링
      // 디렉토리(type=tree)도 필터링
      // → 코드 파일 3개만 다운로드
      expect(mockFetch).toHaveBeenCalledTimes(5) // meta + tree + 3 files
    })

    it('512KB 초과 파일을 건너뛴다', async () => {
      const bigTree = {
        ...TREE_RESPONSE,
        tree: [
          { path: 'small.ts', mode: '100644', type: 'blob' as const, sha: 'sha1', size: 100, url: '' },
          { path: 'huge.ts', mode: '100644', type: 'blob' as const, sha: 'sha2', size: 600_000, url: '' },
        ],
      }

      mockFetch
        .mockResolvedValueOnce(jsonResponse(REPO_META))
        .mockResolvedValueOnce(jsonResponse(bigTree))
        .mockResolvedValueOnce(fileContentResponse('small content'))

      const result = await provider.connectRepo({ repoUrl: 'acme/erp-system' })

      expect(result.summary.indexed).toBe(1) // small.ts만
      expect(mockFetch).toHaveBeenCalledTimes(3) // meta + tree + 1 file
    })

    it('인증 실패 시 명확한 에러 메시지를 반환한다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}, 401))

      await expect(
        provider.connectRepo({ repoUrl: 'acme/private-repo', pat: 'bad-token' }),
      ).rejects.toThrow('GitHub 인증에 실패했어요')
    })

    it('404 시 리포지토리 미발견 에러를 반환한다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}, 404))

      await expect(
        provider.connectRepo({ repoUrl: 'acme/nonexistent' }),
      ).rejects.toThrow('리포지토리를 찾을 수 없어요')
    })

    it('파일 다운로드 실패 시 failed 카운트에 반영한다', async () => {
      const singleFileTree = {
        ...TREE_RESPONSE,
        tree: [
          { path: 'fail.ts', mode: '100644', type: 'blob' as const, sha: 'sha-fail', size: 100, url: '' },
        ],
      }

      mockFetch
        .mockResolvedValueOnce(jsonResponse(REPO_META))
        .mockResolvedValueOnce(jsonResponse(singleFileTree))
        .mockResolvedValueOnce(jsonResponse({}, 500)) // 파일 다운로드 실패

      const result = await provider.connectRepo({ repoUrl: 'acme/erp-system' })

      expect(result.summary.indexed).toBe(0)
      expect(result.summary.failed).toBe(1)
    })

    it('동기화 중 에러 발생 시 syncStatus를 error로 설정한다', async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse(REPO_META))
        .mockRejectedValueOnce(new Error('네트워크 오류')) // fetchTree 실패

      await expect(
        provider.connectRepo({ repoUrl: 'acme/erp-system' }),
      ).rejects.toThrow('네트워크 오류')

      expect(mockSourceRepo.updateSyncStatus).toHaveBeenCalledWith(
        'src-1', 'error', undefined,
      )
    })
  })

  // ─── syncRepo (변경 감지) ───

  describe('syncRepo', () => {
    it('source가 없으면 에러를 던진다', async () => {
      mockSourceRepo.getById.mockReturnValue(null)

      await expect(provider.syncRepo('nonexistent')).rejects.toThrow('GitHub source를 찾을 수 없습니다')
    })

    it('kind가 api가 아니면 에러를 던진다', async () => {
      mockSourceRepo.getById.mockReturnValue({ id: 's1', kind: 'local-folder' })

      await expect(provider.syncRepo('s1')).rejects.toThrow('GitHub source를 찾을 수 없습니다')
    })

    it('provider가 github이 아니면 에러를 던진다', async () => {
      mockSourceRepo.getById.mockReturnValue({
        id: 's1', kind: 'api',
        connectionMeta: { provider: 'gitlab' },
      })

      await expect(provider.syncRepo('s1')).rejects.toThrow('GitHub 연결 정보가 올바르지 않습니다')
    })

    it('변경되지 않은 파일은 다운로드하지 않는다 (SHA 비교)', async () => {
      const source = {
        id: 'src-1', kind: 'api',
        classificationDefault: 'reference',
        connectionMeta: { provider: 'github', owner: 'acme', repo: 'erp', branch: 'main' },
        lastIndexedAt: null,
      }
      mockSourceRepo.getById.mockReturnValue(source)

      // 기존 문서 — SHA가 동일
      mockDocumentRepo.listHashesBySource.mockReturnValue([
        { id: 'doc-1', relativePath: 'src/main.ts', contentHash: 'sha-main-ts' },
      ])

      const unchangedTree = {
        ...TREE_RESPONSE,
        tree: [
          { path: 'src/main.ts', mode: '100644', type: 'blob' as const, sha: 'sha-main-ts', size: 100, url: '' },
        ],
      }

      mockFetch
        .mockResolvedValueOnce(jsonResponse(unchangedTree)) // fetchTree

      const result = await provider.syncRepo('src-1')

      expect(result.unchanged).toBe(1)
      expect(result.indexed).toBe(0)
      // fetchTree 호출만, 파일 다운로드 없음
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('삭제된 파일을 감지하여 제거한다', async () => {
      const source = {
        id: 'src-1', kind: 'api',
        classificationDefault: 'reference',
        connectionMeta: { provider: 'github', owner: 'acme', repo: 'erp', branch: 'main' },
        lastIndexedAt: null,
      }
      mockSourceRepo.getById.mockReturnValue(source)

      // 기존 문서에 deleted.ts가 있지만 트리에는 없음
      mockDocumentRepo.listHashesBySource.mockReturnValue([
        { id: 'doc-deleted', relativePath: 'src/deleted.ts', contentHash: 'sha-old' },
      ])

      const emptyTree = { ...TREE_RESPONSE, tree: [] }
      mockFetch.mockResolvedValueOnce(jsonResponse(emptyTree))

      const result = await provider.syncRepo('src-1')

      expect(result.removed).toBe(1)
      expect(mockDocumentRepo.deleteByIds).toHaveBeenCalledWith(['doc-deleted'])
    })
  })
})
