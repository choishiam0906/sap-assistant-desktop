import { useState, useEffect, useRef } from 'react'
import {
  KeyRound, Sun, Moon, Monitor, AlertCircle,
  Eye, EyeOff, CheckCircle, MoreHorizontal,
  Sparkles, Palette, Info, Plus, ArrowLeft, X, ChevronRight,
  Keyboard, FolderCog, ShieldCheck, Tag, Command, User,
} from 'lucide-react'
import type { ProviderType, AuthStatus, SecurityMode, DomainPack } from '../../main/contracts.js'
import { PROVIDER_LABELS, PROVIDER_MODELS } from '../../main/contracts.js'
import { Button } from '../components/ui/Button.js'
import { Badge } from '../components/ui/Badge.js'
import { useSettingsStore } from '../stores/settingsStore.js'
import {
  useWorkspaceStore,
  SECURITY_MODE_DETAILS,
  DOMAIN_PACK_DETAILS,
} from '../stores/workspaceStore.js'
import './SettingsPage.css'

const api = window.sapOpsDesktop

// ─── 타입 & 상수 ───────────────────────────────────

type SettingsCategory = 'app' | 'ai' | 'appearance' | 'input' | 'workspace' | 'permissions' | 'labels' | 'shortcuts' | 'preferences'
type SetupStep = 'provider' | 'credentials'
type SetupMode = 'add' | 'edit'

interface ProviderState {
  status: AuthStatus
  accountHint: string | null
  loading: boolean
  error: string
}

const CATEGORIES: { id: SettingsCategory; label: string; desc: string; Icon: typeof Monitor }[] = [
  { id: 'app', label: 'App', desc: '앱 정보', Icon: Monitor },
  { id: 'ai', label: 'AI', desc: '모델, 연결 관리', Icon: Sparkles },
  { id: 'appearance', label: 'Appearance', desc: '테마, 폰트', Icon: Palette },
  { id: 'input', label: 'Input', desc: '입력, 전송 설정', Icon: Keyboard },
  { id: 'workspace', label: 'Workspace', desc: '보안 모드, 도메인', Icon: FolderCog },
  { id: 'permissions', label: 'Permissions', desc: '정책 요약', Icon: ShieldCheck },
  { id: 'labels', label: 'Labels', desc: '세션 레이블', Icon: Tag },
  { id: 'shortcuts', label: 'Shortcuts', desc: '단축키', Icon: Command },
  { id: 'preferences', label: 'Preferences', desc: '사용자 설정', Icon: User },
]

const PROVIDERS: { type: ProviderType; name: string; placeholder: string; desc: string }[] = [
  { type: 'openai', name: 'OpenAI', placeholder: 'sk-...', desc: 'GPT-4.1, GPT-4o 등' },
  { type: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...', desc: 'Claude Sonnet, Opus 등' },
  { type: 'google', name: 'Google Gemini', placeholder: 'AIza...', desc: 'Gemini Pro, Flash 등' },
]

const THEME_OPTIONS = [
  { value: 'system' as const, label: '시스템', Icon: Monitor, desc: 'OS 설정에 따라 자동 전환' },
  { value: 'light' as const, label: '라이트', Icon: Sun, desc: '밝은 테마' },
  { value: 'dark' as const, label: '다크', Icon: Moon, desc: '어두운 테마' },
]

const FONT_OPTIONS = [
  { value: 'pretendard' as const, label: 'Pretendard', desc: '깔끔한 한글 전용 폰트' },
  { value: 'system' as const, label: 'System', desc: 'OS 기본 시스템 폰트' },
]

const SECURITY_MODES: SecurityMode[] = ['secure-local', 'reference', 'hybrid-approved']
const DOMAIN_PACKS: DomainPack[] = ['ops', 'functional', 'cbo-maintenance', 'pi-integration', 'btp-rap-cap']

const SHORTCUTS = {
  chat: [
    { keys: ['Enter'], action: '메시지 전송' },
    { keys: ['Shift', 'Enter'], action: '줄바꿈' },
  ],
  navigation: [
    { keys: ['←', '→'], action: '사이드바 접기/펼치기' },
  ],
}

const APP_VERSION = '3.0.0'

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

// ─── 메인 컴포넌트 ─────────────────────────────────

export function SettingsPage() {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('app')

  // Provider 인증 상태
  const defaultProviderState: ProviderState = { status: 'unauthenticated', accountHint: null, loading: false, error: '' }
  const [states, setStates] = useState<Record<ProviderType, ProviderState>>({
    openai: { ...defaultProviderState },
    anthropic: { ...defaultProviderState },
    google: { ...defaultProviderState },
  })
  const [openMenu, setOpenMenu] = useState<ProviderType | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Setup overlay 상태
  const [showSetup, setShowSetup] = useState(false)
  const [setupStep, setSetupStep] = useState<SetupStep>('provider')
  const [setupMode, setSetupMode] = useState<SetupMode>('add')
  const [setupProvider, setSetupProvider] = useState<ProviderType | null>(null)
  const [setupApiKey, setSetupApiKey] = useState('')
  const [setupShowKey, setSetupShowKey] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState('')
  const [setupSuccess, setSetupSuccess] = useState(false)

  const {
    theme, setTheme,
    defaultProvider, defaultModel, setDefaultProvider, setDefaultModel,
    fontFamily, setFontFamily,
    sendKey, setSendKey,
    spellCheck, setSpellCheck,
    autoCapitalization, setAutoCapitalization,
    notificationsEnabled, setNotificationsEnabled,
    userName, setUserName,
    language, setLanguage,
  } = useSettingsStore()

  const {
    securityMode, setSecurityMode,
    domainPack, setDomainPack,
  } = useWorkspaceStore()

  // 외부 클릭으로 액션 메뉴 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    if (openMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openMenu])

  useEffect(() => { checkAllStatus() }, [])

  async function checkAllStatus() {
    for (const p of PROVIDERS) {
      try {
        const result = await api.getAuthStatus(p.type)
        setStates((prev) => ({
          ...prev,
          [p.type]: {
            ...prev[p.type],
            status: result?.status ?? 'unauthenticated',
            accountHint: result?.accountHint ?? null,
          },
        }))
      } catch (err) {
        console.error(`[Settings] ${p.type} 상태 확인 실패:`, err)
      }
    }
  }

  // ─── Setup overlay ────────────────────────────────

  function openSetupOverlay(provider?: ProviderType) {
    if (provider) {
      setSetupMode('edit')
      setSetupProvider(provider)
      setSetupStep('credentials')
    } else {
      setSetupMode('add')
      setSetupProvider(null)
      setSetupStep('provider')
    }
    setSetupApiKey('')
    setSetupShowKey(false)
    setSetupError('')
    setSetupSuccess(false)
    setSetupLoading(false)
    setShowSetup(true)
  }

  function closeSetup() {
    setShowSetup(false)
    setSetupProvider(null)
    setSetupStep('provider')
    setSetupApiKey('')
    setSetupShowKey(false)
    setSetupError('')
    setSetupSuccess(false)
  }

  function selectSetupProvider(provider: ProviderType) {
    setSetupProvider(provider)
    setSetupStep('credentials')
    setSetupError('')
  }

  async function submitSetup() {
    if (!setupProvider || !setupApiKey.trim()) return
    setSetupLoading(true)
    setSetupError('')
    try {
      const result = await api.setApiKey({ provider: setupProvider, apiKey: setupApiKey.trim() })
      setStates((prev) => ({
        ...prev,
        [setupProvider!]: {
          status: result.status,
          accountHint: result.accountHint,
          loading: false,
          error: '',
        },
      }))
      setSetupSuccess(true)
      setTimeout(() => closeSetup(), 1200)
    } catch (err) {
      console.error(`[Settings] ${setupProvider} API Key 저장 실패:`, err)
      setSetupError(`연결 실패: ${errorMessage(err)}`)
    } finally {
      setSetupLoading(false)
    }
  }

  // ─── Connection 액션 ──────────────────────────────

  async function handleLogout(provider: ProviderType) {
    try {
      await api.logout(provider)
      setStates((prev) => ({
        ...prev,
        [provider]: { status: 'unauthenticated', accountHint: null, loading: false, error: '' },
      }))
      if (defaultProvider === provider) {
        const other = PROVIDERS.find((p) => p.type !== provider && states[p.type].status === 'authenticated')
        if (other) setDefaultProvider(other.type)
      }
    } catch (err) {
      console.error(`[Settings] ${provider} 로그아웃 실패:`, err)
      setStates((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], error: `연결 해제 실패: ${errorMessage(err)}` },
      }))
    }
    setOpenMenu(null)
  }

  function handleSetDefault(provider: ProviderType) {
    setDefaultProvider(provider)
    setOpenMenu(null)
  }

  function handleChangeKey(provider: ProviderType) {
    setOpenMenu(null)
    openSetupOverlay(provider)
  }

  // ─── 파생 데이터 ──────────────────────────────────

  const authenticatedProviders = PROVIDERS.filter((p) => states[p.type].status === 'authenticated')
  const unconnectedProviders = PROVIDERS.filter((p) => states[p.type].status !== 'authenticated')
  const allUnauthenticated = authenticatedProviders.length === 0

  // Permissions 파생 데이터
  const currentModeDetail = SECURITY_MODE_DETAILS[securityMode]
  const permissionSummary = {
    outbound: securityMode === 'secure-local' ? '차단' : securityMode === 'reference' ? '허용' : '승인 후 전달',
    approval: securityMode === 'hybrid-approved' ? '요약본 승인 필요' : '필요 없음',
  }

  // ─── 렌더링 ───────────────────────────────────────

  return (
    <div className="settings-page page-enter">
      {/* 왼쪽 카테고리 네비게이션 */}
      <nav className="settings-nav" aria-label="설정 카테고리">
        <h2 className="settings-nav-title">설정</h2>
        <ul className="settings-nav-list">
          {CATEGORIES.map(({ id, label, desc, Icon }) => (
            <li key={id}>
              <button
                className={`settings-nav-item ${activeCategory === id ? 'active' : ''}`}
                onClick={() => setActiveCategory(id)}
                aria-current={activeCategory === id ? 'page' : undefined}
              >
                <Icon size={18} className="settings-nav-icon" aria-hidden="true" />
                <div className="settings-nav-text">
                  <span className="settings-nav-label">{label}</span>
                  <span className="settings-nav-desc">{desc}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* 오른쪽 상세 패널 */}
      <div className="settings-detail">
        {/* ── App 패널 ── */}
        {activeCategory === 'app' && (
          <div className="settings-panel page-enter">
            <h3 className="panel-title">App</h3>
            <p className="panel-desc">앱 정보와 버전을 확인해요</p>

            <section className="settings-section">
              <h4 className="section-title">About</h4>
              <div className="settings-card">
                <div className="settings-row">
                  <span className="settings-row-label">앱 이름</span>
                  <span className="settings-row-value">SAP Assistant Desktop</span>
                </div>
                <div className="settings-row">
                  <span className="settings-row-label">버전</span>
                  <span className="settings-row-value">v{APP_VERSION}</span>
                </div>
                <div className="settings-row">
                  <span className="settings-row-label">런타임</span>
                  <span className="settings-row-value">Electron</span>
                </div>
              </div>
            </section>

            <section className="settings-section">
              <h4 className="section-title">Notifications</h4>
              <div className="settings-card">
                <div className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-label">데스크톱 알림</span>
                    <span className="settings-toggle-desc">AI 작업 완료 시 데스크톱 알림을 표시해요</span>
                  </div>
                  <button
                    className={`toggle-switch ${notificationsEnabled ? 'active' : ''}`}
                    role="switch"
                    aria-checked={notificationsEnabled}
                    aria-label="데스크톱 알림"
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>
              </div>
            </section>

            <section className="settings-section">
              <div className="app-info-card">
                <Info size={16} className="app-info-icon" aria-hidden="true" />
                <p>업데이트 확인과 릴리즈 노트는 GitHub에서 확인할 수 있어요.</p>
              </div>
            </section>
          </div>
        )}

        {/* ── AI 패널 ── */}
        {activeCategory === 'ai' && (
          <div className="settings-panel page-enter">
            <h3 className="panel-title">AI</h3>
            <p className="panel-desc">AI 모델과 API 연결을 관리해요</p>

            {/* 기본값 섹션 */}
            <section className="settings-section">
              <h4 className="section-title">기본값</h4>
              <div className="settings-card">
                {allUnauthenticated ? (
                  <div className="settings-row">
                    <span className="settings-row-label">Connection</span>
                    <span className="settings-row-empty">인증된 connection이 없어요</span>
                  </div>
                ) : (
                  <>
                    <div className="settings-row">
                      <label className="settings-row-label" htmlFor="default-connection">Connection</label>
                      <select
                        id="default-connection"
                        className="settings-select"
                        value={defaultProvider}
                        onChange={(e) => setDefaultProvider(e.target.value as ProviderType)}
                      >
                        {authenticatedProviders.map((p) => (
                          <option key={p.type} value={p.type}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="settings-row">
                      <label className="settings-row-label" htmlFor="default-model">Model</label>
                      <select
                        id="default-model"
                        className="settings-select"
                        value={defaultModel}
                        onChange={(e) => setDefaultModel(e.target.value)}
                      >
                        {PROVIDER_MODELS[defaultProvider].map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Connections 섹션 */}
            <section className="settings-section">
              <div className="section-header">
                <h4 className="section-title">Connections</h4>
                {unconnectedProviders.length > 0 && !allUnauthenticated && (
                  <button className="add-connection-btn" onClick={() => openSetupOverlay()}>
                    <Plus size={14} aria-hidden="true" />
                    <span>연결 추가</span>
                  </button>
                )}
              </div>

              {allUnauthenticated ? (
                <div className="onboarding-card">
                  <KeyRound size={32} className="onboarding-icon" aria-hidden="true" />
                  <h4>시작하기</h4>
                  <p>API Key를 등록하면 AI 기반 채팅과 CBO 분석을 사용할 수 있어요.</p>
                  <Button variant="primary" size="md" onClick={() => openSetupOverlay()} className="onboarding-cta">
                    연결 추가
                  </Button>
                </div>
              ) : (
                <div className="settings-card">
                  {authenticatedProviders.map(({ type, name }, idx) => {
                    const state = states[type]
                    const isDefault = defaultProvider === type
                    return (
                      <div key={type} className={`connection-row ${idx > 0 ? 'connection-row-border' : ''}`}>
                        <div className="connection-main">
                          <div className="connection-info">
                            <div className="connection-name-row">
                              <KeyRound size={16} className="connection-icon" aria-hidden="true" />
                              <span className="connection-name">{name}</span>
                              {isDefault && <Badge variant="info" aria-label="기본 연결">Default</Badge>}
                              <Badge variant="success" aria-label="인증 상태: 인증됨">인증됨</Badge>
                            </div>
                            <span className="connection-hint">{state.accountHint ?? '인증됨'}</span>
                          </div>
                          <div className="connection-actions">
                            <div className="action-menu-wrapper" ref={openMenu === type ? menuRef : undefined}>
                              <button
                                className="action-menu-trigger"
                                onClick={() => setOpenMenu(openMenu === type ? null : type)}
                                aria-label={`${name} 메뉴`}
                                aria-expanded={openMenu === type}
                              >
                                <MoreHorizontal size={18} />
                              </button>
                              {openMenu === type && (
                                <div className="action-menu" role="menu">
                                  {!isDefault && (
                                    <button
                                      className="action-menu-item"
                                      role="menuitem"
                                      onClick={() => handleSetDefault(type)}
                                    >
                                      기본으로 설정
                                    </button>
                                  )}
                                  <button
                                    className="action-menu-item"
                                    role="menuitem"
                                    onClick={() => handleChangeKey(type)}
                                  >
                                    API Key 변경
                                  </button>
                                  <button
                                    className="action-menu-item action-menu-item-danger"
                                    role="menuitem"
                                    onClick={() => handleLogout(type)}
                                  >
                                    연결 해제
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {state.error && (
                          <div className="provider-error" role="alert">
                            <AlertCircle size={14} aria-hidden="true" />
                            <span>{state.error}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* ── Setup Overlay ── */}
            {showSetup && (
              <div className="setup-overlay" role="dialog" aria-modal="true" aria-label="연결 설정">
                <div className="setup-overlay-backdrop" onClick={closeSetup} />
                <div className="setup-panel">
                  {/* 헤더 */}
                  <div className="setup-header">
                    {setupStep === 'credentials' && setupMode === 'add' && !setupSuccess && (
                      <button className="setup-nav-btn" onClick={() => { setSetupStep('provider'); setSetupError('') }} aria-label="뒤로">
                        <ArrowLeft size={18} />
                      </button>
                    )}
                    <h3 className="setup-title">
                      {setupStep === 'provider'
                        ? '연결 추가'
                        : setupMode === 'edit'
                          ? 'API Key 변경'
                          : `${setupProvider ? PROVIDER_LABELS[setupProvider] : ''} 연결`}
                    </h3>
                    <button className="setup-nav-btn" onClick={closeSetup} aria-label="닫기">
                      <X size={18} />
                    </button>
                  </div>

                  {/* Provider 선택 */}
                  {setupStep === 'provider' && (
                    <div className="setup-body">
                      <p className="setup-desc">연결할 AI Provider를 선택해주세요</p>
                      <div className="provider-select-list">
                        {unconnectedProviders.map(({ type, name, desc }) => (
                          <button key={type} className="provider-select-card" onClick={() => selectSetupProvider(type)}>
                            <div className="provider-select-icon">
                              <KeyRound size={20} />
                            </div>
                            <div className="provider-select-info">
                              <span className="provider-select-name">{name}</span>
                              <span className="provider-select-desc">{desc}</span>
                            </div>
                            <ChevronRight size={16} className="provider-select-arrow" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Credentials 입력 */}
                  {setupStep === 'credentials' && setupProvider && (
                    <div className="setup-body">
                      {setupSuccess ? (
                        <div className="setup-success-state">
                          <CheckCircle size={40} />
                          <h4>연결 완료!</h4>
                          <p>{PROVIDER_LABELS[setupProvider]}에 성공적으로 연결되었어요.</p>
                        </div>
                      ) : (
                        <>
                          <p className="setup-desc">
                            {PROVIDER_LABELS[setupProvider]} API Key를 입력해주세요
                          </p>
                          <div className="setup-form">
                            <div className="api-key-input-row">
                              <input
                                type={setupShowKey ? 'text' : 'password'}
                                value={setupApiKey}
                                onChange={(e) => setSetupApiKey(e.target.value)}
                                placeholder={PROVIDERS.find((p) => p.type === setupProvider)?.placeholder}
                                className="api-key-input"
                                aria-label={`${PROVIDER_LABELS[setupProvider]} API Key`}
                                onKeyDown={(e) => { if (e.key === 'Enter') submitSetup() }}
                                autoFocus
                              />
                              <button
                                type="button"
                                className="toggle-visibility"
                                onClick={() => setSetupShowKey(!setupShowKey)}
                                aria-label={setupShowKey ? '숨기기' : '보기'}
                              >
                                {setupShowKey ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                            {setupError && (
                              <div className="provider-error" role="alert">
                                <AlertCircle size={14} aria-hidden="true" />
                                <span>{setupError}</span>
                              </div>
                            )}
                            <div className="setup-actions">
                              <Button variant="secondary" size="md" onClick={closeSetup}>취소</Button>
                              <Button
                                variant="primary"
                                size="md"
                                onClick={submitSetup}
                                loading={setupLoading}
                                disabled={!setupApiKey.trim()}
                              >
                                연결
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Appearance 패널 ── */}
        {activeCategory === 'appearance' && (
          <div className="settings-panel page-enter">
            <h3 className="panel-title">Appearance</h3>
            <p className="panel-desc">앱의 외관을 설정해요</p>

            <section className="settings-section">
              <h4 className="section-title">테마</h4>
              <div className="theme-options" role="radiogroup" aria-label="테마 선택">
                {THEME_OPTIONS.map(({ value, label, Icon, desc }) => (
                  <button
                    key={value}
                    role="radio"
                    aria-checked={theme === value}
                    className={`theme-option ${theme === value ? 'active' : ''}`}
                    onClick={() => setTheme(value)}
                  >
                    <Icon size={20} aria-hidden="true" />
                    <span className="theme-label">{label}</span>
                    <span className="theme-desc">{desc}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="settings-section">
              <h4 className="section-title">폰트</h4>
              <div className="settings-card">
                {FONT_OPTIONS.map(({ value, label, desc }) => (
                  <div key={value} className="settings-toggle-row">
                    <div className="settings-toggle-info">
                      <span className="settings-toggle-label">{label}</span>
                      <span className="settings-toggle-desc">{desc}</span>
                    </div>
                    <button
                      role="radio"
                      aria-checked={fontFamily === value}
                      className={`font-radio ${fontFamily === value ? 'active' : ''}`}
                      onClick={() => setFontFamily(value)}
                      aria-label={label}
                    >
                      <span className="font-radio-dot" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ── Input 패널 ── */}
        {activeCategory === 'input' && (
          <div className="settings-panel page-enter">
            <h3 className="panel-title">Input</h3>
            <p className="panel-desc">입력 방식과 전송 설정을 관리해요</p>

            <section className="settings-section">
              <h4 className="section-title">Typing</h4>
              <div className="settings-card">
                <div className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-label">자동 대문자</span>
                    <span className="settings-toggle-desc">문장 시작 시 자동으로 대문자로 변환해요</span>
                  </div>
                  <button
                    className={`toggle-switch ${autoCapitalization ? 'active' : ''}`}
                    role="switch"
                    aria-checked={autoCapitalization}
                    aria-label="자동 대문자"
                    onClick={() => setAutoCapitalization(!autoCapitalization)}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>
                <div className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-label">맞춤법 검사</span>
                    <span className="settings-toggle-desc">입력 시 맞춤법을 자동으로 검사해요</span>
                  </div>
                  <button
                    className={`toggle-switch ${spellCheck ? 'active' : ''}`}
                    role="switch"
                    aria-checked={spellCheck}
                    aria-label="맞춤법 검사"
                    onClick={() => setSpellCheck(!spellCheck)}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>
              </div>
            </section>

            <section className="settings-section">
              <h4 className="section-title">Sending</h4>
              <div className="settings-card">
                <div className="settings-row">
                  <label className="settings-row-label" htmlFor="send-key-select">메시지 전송 키</label>
                  <select
                    id="send-key-select"
                    className="settings-select"
                    value={sendKey}
                    onChange={(e) => setSendKey(e.target.value as 'enter' | 'ctrl-enter')}
                  >
                    <option value="enter">Enter</option>
                    <option value="ctrl-enter">Ctrl + Enter</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ── Workspace 패널 ── */}
        {activeCategory === 'workspace' && (
          <div className="settings-panel page-enter">
            <h3 className="panel-title">Workspace</h3>
            <p className="panel-desc">보안 모드와 도메인 팩을 설정해요</p>

            <section className="settings-section">
              <h4 className="section-title">Security Mode</h4>
              <div className="workspace-mode-options">
                {SECURITY_MODES.map((mode) => {
                  const detail = SECURITY_MODE_DETAILS[mode]
                  const isActive = securityMode === mode
                  return (
                    <button
                      key={mode}
                      className={`workspace-mode-card ${isActive ? 'active' : ''}`}
                      onClick={() => setSecurityMode(mode)}
                      aria-pressed={isActive}
                    >
                      <div className="workspace-mode-check">
                        {isActive && <CheckCircle size={18} />}
                      </div>
                      <div className="workspace-mode-content">
                        <span className="workspace-mode-name">{detail.label}</span>
                        <span className="workspace-mode-desc">{detail.description}</span>
                        <span className="workspace-mode-policy">{detail.outboundPolicy}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="settings-section">
              <h4 className="section-title">Domain Pack</h4>
              <div className="workspace-pack-options">
                {DOMAIN_PACKS.map((pack) => {
                  const detail = DOMAIN_PACK_DETAILS[pack]
                  const isActive = domainPack === pack
                  return (
                    <button
                      key={pack}
                      className={`workspace-pack-card ${isActive ? 'active' : ''}`}
                      onClick={() => setDomainPack(pack)}
                      aria-pressed={isActive}
                    >
                      <span className="workspace-pack-label">{detail.label}</span>
                      <span className="workspace-pack-desc">{detail.description}</span>
                    </button>
                  )
                })}
              </div>
              {DOMAIN_PACK_DETAILS[domainPack].recommendedSecurityMode !== securityMode && (
                <div className="workspace-recommend-banner">
                  <Info size={14} aria-hidden="true" />
                  <span>
                    이 Domain Pack의 권장 Security Mode는 <strong>{SECURITY_MODE_DETAILS[DOMAIN_PACK_DETAILS[domainPack].recommendedSecurityMode].label}</strong>이에요.
                  </span>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── Permissions 패널 (읽기 전용) ── */}
        {activeCategory === 'permissions' && (
          <div className="settings-panel page-enter">
            <h3 className="panel-title">Permissions</h3>
            <p className="panel-desc">현재 적용 중인 보안 정책을 확인해요</p>

            <section className="settings-section">
              <h4 className="section-title">현재 정책</h4>
              <div className="settings-card">
                <div className="settings-row">
                  <span className="settings-row-label">Security Mode</span>
                  <Badge variant={currentModeDetail.badgeVariant}>{currentModeDetail.label}</Badge>
                </div>
                <div className="settings-row">
                  <span className="settings-row-label">외부 전송</span>
                  <span className="settings-row-value">{permissionSummary.outbound}</span>
                </div>
                <div className="settings-row">
                  <span className="settings-row-label">승인 필요</span>
                  <span className="settings-row-value">{permissionSummary.approval}</span>
                </div>
              </div>
            </section>

            <section className="settings-section">
              <div className="app-info-card">
                <Info size={16} className="app-info-icon" aria-hidden="true" />
                <p>정책은 Workspace 카테고리에서 변경할 수 있어요.</p>
              </div>
            </section>
          </div>
        )}

        {/* ── Labels 패널 (Coming Soon) ── */}
        {activeCategory === 'labels' && (
          <div className="settings-panel page-enter">
            <h3 className="panel-title">Labels</h3>
            <p className="panel-desc">세션에 레이블을 붙여 관리해요</p>

            <section className="settings-section">
              <div className="coming-soon-card">
                <Tag size={40} className="coming-soon-icon" aria-hidden="true" />
                <h4>준비 중이에요</h4>
                <p>세션 레이블 기능은 향후 업데이트에서 추가될 예정이에요.</p>
              </div>
            </section>
          </div>
        )}

        {/* ── Shortcuts 패널 ── */}
        {activeCategory === 'shortcuts' && (
          <div className="settings-panel page-enter">
            <h3 className="panel-title">Shortcuts</h3>
            <p className="panel-desc">앱에서 사용할 수 있는 단축키에요</p>

            <section className="settings-section">
              <h4 className="section-title">채팅</h4>
              <div className="settings-card">
                {SHORTCUTS.chat.map(({ keys, action }) => (
                  <div key={action} className="shortcut-row">
                    <span className="shortcut-action">{action}</span>
                    <div className="shortcut-keys">
                      {keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && <span className="shortcut-plus">+</span>}
                          <kbd className="kbd">{key}</kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="settings-section">
              <h4 className="section-title">내비게이션</h4>
              <div className="settings-card">
                {SHORTCUTS.navigation.map(({ keys, action }) => (
                  <div key={action} className="shortcut-row">
                    <span className="shortcut-action">{action}</span>
                    <div className="shortcut-keys">
                      {keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && <span className="shortcut-plus"> / </span>}
                          <kbd className="kbd">{key}</kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ── Preferences 패널 ── */}
        {activeCategory === 'preferences' && (
          <div className="settings-panel page-enter">
            <h3 className="panel-title">Preferences</h3>
            <p className="panel-desc">사용자 기본 정보를 설정해요</p>

            <section className="settings-section">
              <h4 className="section-title">기본 정보</h4>
              <div className="settings-card">
                <div className="settings-row">
                  <label className="settings-row-label" htmlFor="user-name-input">이름</label>
                  <input
                    id="user-name-input"
                    type="text"
                    className="settings-input"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="이름을 입력하세요"
                  />
                </div>
                <div className="settings-row">
                  <label className="settings-row-label" htmlFor="language-select">언어</label>
                  <select
                    id="language-select"
                    className="settings-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'ko' | 'en')}
                  >
                    <option value="ko">한국어</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
