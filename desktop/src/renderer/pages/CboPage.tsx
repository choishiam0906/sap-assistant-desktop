import { useState } from 'react'
import type {
  CboAnalysisResult,
  CboAnalysisRunSummary,
  CboRunDiffOutput,
  ProviderType,
} from '../../main/contracts.js'
import './CboPage.css'

const api = window.sapOpsDesktop

type Tab = 'text' | 'file' | 'history'

export function CboPage() {
  const [tab, setTab] = useState<Tab>('text')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  // 텍스트 분석
  const [fileName, setFileName] = useState('inline-cbo.md')
  const [sourceText, setSourceText] = useState('')
  const [useLlm, setUseLlm] = useState(false)
  const [provider, setProvider] = useState<ProviderType>('codex')
  const [model, setModel] = useState('gpt-4.1-mini')
  const [result, setResult] = useState<CboAnalysisResult | null>(null)

  // 이력
  const [runs, setRuns] = useState<CboAnalysisRunSummary[]>([])
  const [selectedRunId, setSelectedRunId] = useState('')
  const [fromRunId, setFromRunId] = useState('')
  const [diffResult, setDiffResult] = useState<CboRunDiffOutput | null>(null)

  function llmOpts() {
    if (!useLlm) return {}
    return { provider, model }
  }

  async function analyzeText() {
    if (!sourceText.trim()) { setError('분석할 텍스트를 입력하세요'); return }
    setBusy(true); setError(''); setStatus('텍스트 분석 중...')
    try {
      const res = await api.analyzeCboText({ fileName, content: sourceText, ...llmOpts() })
      setResult(res)
      setStatus('텍스트 분석 완료')
    } catch (e) { setError(e instanceof Error ? e.message : '분석 실패') }
    finally { setBusy(false) }
  }

  async function pickFile() {
    setBusy(true); setError(''); setStatus('파일 선택 대기 중...')
    try {
      const res = await api.pickAndAnalyzeCboFile(llmOpts())
      if (!res || res.canceled) { setStatus('파일 선택 취소됨'); return }
      setResult(res.result)
      setStatus(`파일 분석 완료: ${res.filePath}`)
    } catch (e) { setError(e instanceof Error ? e.message : '분석 실패') }
    finally { setBusy(false) }
  }

  async function pickFolder() {
    setBusy(true); setError(''); setStatus('폴더 선택 대기 중...')
    try {
      const res = await api.pickAndAnalyzeCboFolder({ recursive: true, skipUnchanged: true, ...llmOpts() })
      if (!res || res.canceled || !res.output) { setStatus('폴더 선택 취소됨'); return }
      setSelectedRunId(res.output.run.id)
      setStatus(`배치 분석 완료: ${res.output.run.successFiles}건 성공`)
      await loadRuns()
      setTab('history')
    } catch (e) { setError(e instanceof Error ? e.message : '분석 실패') }
    finally { setBusy(false) }
  }

  async function loadRuns() {
    try {
      const list = await api.listCboRuns(20)
      const arr = Array.isArray(list) ? list : []
      setRuns(arr)
      if (arr.length > 0) setSelectedRunId(arr[0].id)
      if (arr.length > 1) setFromRunId(arr[1].id)
    } catch { setRuns([]) }
  }

  async function loadRunDetail() {
    if (!selectedRunId) return
    setBusy(true); setStatus('상세 조회 중...')
    try {
      const detail = await api.getCboRunDetail(selectedRunId, 500)
      setResult(null)
      setDiffResult(null)
      setStatus(`Run 상세: ${detail.files?.length ?? 0}개 파일`)
    } catch (e) { setError(e instanceof Error ? e.message : '조회 실패') }
    finally { setBusy(false) }
  }

  async function diffRuns() {
    if (!selectedRunId || !fromRunId) { setError('비교할 Run ID를 입력하세요'); return }
    setBusy(true); setStatus('Run 비교 중...')
    try {
      const diff = await api.diffCboRuns({ fromRunId, toRunId: selectedRunId })
      setDiffResult(diff)
      setStatus(`비교 완료: 신규 ${diff.added} / 해소 ${diff.resolved} / 지속 ${diff.persisted}`)
    } catch (e) { setError(e instanceof Error ? e.message : '비교 실패') }
    finally { setBusy(false) }
  }

  async function syncKnowledge() {
    if (!selectedRunId) return
    setBusy(true); setStatus('지식 동기화 중...')
    try {
      const out = await api.syncCboRunKnowledge({ runId: selectedRunId })
      setStatus(`동기화 완료(${out.mode}): ${out.synced}건 성공 / ${out.failed}건 실패`)
    } catch (e) { setError(e instanceof Error ? e.message : '동기화 실패') }
    finally { setBusy(false) }
  }

  return (
    <div className="cbo-page">
      <h2 className="page-title">CBO 코드 분석</h2>

      <div className="cbo-tabs">
        {(['text', 'file', 'history'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`cbo-tab ${tab === t ? 'active' : ''}`}
            onClick={() => { setTab(t); if (t === 'history') loadRuns() }}
          >
            {t === 'text' ? '텍스트 분석' : t === 'file' ? '파일·폴더' : '실행 이력'}
          </button>
        ))}
      </div>

      {/* LLM 옵션 */}
      {tab !== 'history' && (
        <div className="llm-options">
          <label className="llm-toggle">
            <input type="checkbox" checked={useLlm} onChange={(e) => setUseLlm(e.target.checked)} />
            LLM 보강 분석
          </label>
          {useLlm && (
            <>
              <select value={provider} onChange={(e) => setProvider(e.target.value as ProviderType)} className="cbo-select">
                <option value="codex">Codex</option>
                <option value="copilot">Copilot</option>
              </select>
              <input value={model} onChange={(e) => setModel(e.target.value)} className="cbo-input" placeholder="모델명" />
            </>
          )}
        </div>
      )}

      {/* 텍스트 분석 탭 */}
      {tab === 'text' && (
        <div className="cbo-section">
          <div className="form-row">
            <label>파일명</label>
            <input value={fileName} onChange={(e) => setFileName(e.target.value)} className="cbo-input" />
          </div>
          <div className="form-row">
            <label>소스 코드</label>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              className="cbo-textarea"
              placeholder="분석할 CBO 소스(.txt/.md)를 붙여넣으세요"
              rows={10}
            />
          </div>
          <button className="btn-primary" onClick={analyzeText} disabled={busy}>
            {busy ? '분석 중...' : '텍스트 분석'}
          </button>
        </div>
      )}

      {/* 파일/폴더 탭 */}
      {tab === 'file' && (
        <div className="cbo-section">
          <p className="cbo-desc">파일 또는 폴더를 선택하여 CBO 규칙 분석을 실행해요</p>
          <div className="cbo-actions">
            <button className="btn-primary" onClick={pickFile} disabled={busy}>파일 선택 후 분석</button>
            <button className="btn-secondary" onClick={pickFolder} disabled={busy}>폴더 배치 분석</button>
          </div>
        </div>
      )}

      {/* 실행 이력 탭 */}
      {tab === 'history' && (
        <div className="cbo-section">
          <div className="runs-list">
            {runs.length === 0 ? (
              <p className="cbo-empty">실행 이력이 없어요</p>
            ) : (
              <table className="runs-table">
                <thead>
                  <tr>
                    <th>실행 ID</th>
                    <th>모드</th>
                    <th>파일 수</th>
                    <th>성공</th>
                    <th>실패</th>
                    <th>시작 시간</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr
                      key={run.id}
                      className={selectedRunId === run.id ? 'selected' : ''}
                      onClick={() => setSelectedRunId(run.id)}
                    >
                      <td className="run-id">{run.id.slice(0, 8)}...</td>
                      <td>{run.mode}</td>
                      <td>{run.totalFiles}</td>
                      <td className="success">{run.successFiles}</td>
                      <td className="fail">{run.failedFiles}</td>
                      <td>{new Date(run.startedAt).toLocaleString('ko-KR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="history-controls">
            <div className="form-row compact">
              <label>Run ID</label>
              <input value={selectedRunId} onChange={(e) => setSelectedRunId(e.target.value)} className="cbo-input" />
            </div>
            <div className="form-row compact">
              <label>비교 기준 Run ID</label>
              <input value={fromRunId} onChange={(e) => setFromRunId(e.target.value)} className="cbo-input" />
            </div>
            <div className="cbo-actions">
              <button className="btn-secondary" onClick={loadRunDetail} disabled={busy}>상세 조회</button>
              <button className="btn-secondary" onClick={diffRuns} disabled={busy}>Run 비교</button>
              <button className="btn-primary" onClick={syncKnowledge} disabled={busy}>지식 동기화</button>
            </div>
          </div>
        </div>
      )}

      {/* 상태 메시지 */}
      {(status || error) && (
        <div className={`cbo-status ${error ? 'error' : ''}`}>
          {error || status}
        </div>
      )}

      {/* 분석 결과 */}
      {result && (
        <div className="cbo-result">
          <h3>분석 결과</h3>
          <p className="result-summary">{result.summary}</p>

          {result.risks.length > 0 && (
            <div className="result-section">
              <h4>리스크</h4>
              <table className="risks-table">
                <thead>
                  <tr><th>심각도</th><th>제목</th><th>설명</th></tr>
                </thead>
                <tbody>
                  {result.risks.map((r, i) => (
                    <tr key={i} className={`severity-${r.severity}`}>
                      <td><span className={`severity-badge ${r.severity}`}>{r.severity}</span></td>
                      <td>{r.title}</td>
                      <td>{r.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.recommendations.length > 0 && (
            <div className="result-section">
              <h4>권장사항</h4>
              <div className="rec-cards">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className={`rec-card priority-${rec.priority}`}>
                    <span className={`priority-badge ${rec.priority}`}>{rec.priority}</span>
                    <strong>{rec.action}</strong>
                    <p>{rec.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Diff 결과 */}
      {diffResult && (
        <div className="cbo-result">
          <h3>Run 비교 결과</h3>
          <div className="diff-summary">
            <span className="diff-added">신규 {diffResult.added}</span>
            <span className="diff-resolved">해소 {diffResult.resolved}</span>
            <span className="diff-persisted">지속 {diffResult.persisted}</span>
          </div>
          {diffResult.changes.length > 0 && (
            <table className="risks-table">
              <thead>
                <tr><th>변경</th><th>심각도</th><th>파일</th><th>제목</th></tr>
              </thead>
              <tbody>
                {diffResult.changes.map((c, i) => (
                  <tr key={i} className={`diff-${c.type}`}>
                    <td>{c.type === 'added' ? '신규' : c.type === 'resolved' ? '해소' : '지속'}</td>
                    <td><span className={`severity-badge ${c.severity}`}>{c.severity}</span></td>
                    <td className="file-path">{c.filePath}</td>
                    <td>{c.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
