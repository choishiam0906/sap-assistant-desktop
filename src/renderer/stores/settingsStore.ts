import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProviderType } from '../../main/contracts.js'
import { DEFAULT_MODELS } from '../../main/contracts.js'

type Theme = 'system' | 'light' | 'dark'
type FontFamily = 'pretendard' | 'system'
type SendKey = 'enter' | 'ctrl-enter'
type Language = 'ko' | 'en'
export type ThinkingLevel = 'off' | 'low' | 'medium' | 'high'

interface SettingsState {
  theme: Theme
  defaultProvider: ProviderType
  defaultModel: string
  fontFamily: FontFamily
  sendKey: SendKey
  spellCheck: boolean
  autoCapitalization: boolean
  notificationsEnabled: boolean
  userName: string
  language: Language
  thinkingLevel: ThinkingLevel
  chatHistoryLimit: number

  setTheme: (theme: Theme) => void
  setDefaultProvider: (provider: ProviderType) => void
  setDefaultModel: (model: string) => void
  setFontFamily: (f: FontFamily) => void
  setSendKey: (k: SendKey) => void
  setSpellCheck: (v: boolean) => void
  setAutoCapitalization: (v: boolean) => void
  setNotificationsEnabled: (v: boolean) => void
  setUserName: (n: string) => void
  setLanguage: (l: Language) => void
  setThinkingLevel: (l: ThinkingLevel) => void
  setChatHistoryLimit: (v: number) => void
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', theme)
  }
}

function applyFont(fontFamily: FontFamily) {
  const root = document.documentElement
  if (fontFamily === 'pretendard') {
    root.style.fontFamily = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
  } else {
    root.style.fontFamily = ''
  }
}

// 기존 분산 localStorage 키에서 값을 읽어 마이그레이트
const LEGACY_KEYS = {
  theme: 'sap-ops-theme',
  defaultProvider: 'sap-ops-default-provider',
  defaultModel: 'sap-ops-default-model',
  fontFamily: 'sap-ops-font-family',
  sendKey: 'sap-ops-send-key',
  spellCheck: 'sap-ops-spell-check',
  autoCapitalization: 'sap-ops-auto-capitalization',
  notificationsEnabled: 'sap-ops-notifications',
  userName: 'sap-ops-user-name',
  language: 'sap-ops-language',
  thinkingLevel: 'sap-ops-thinking-level',
  chatHistoryLimit: 'sap-ops-chat-history-limit',
} as const

function migrateLegacySettings(): Partial<Record<string, unknown>> {
  const result: Record<string, unknown> = {}
  try {
    const theme = localStorage.getItem(LEGACY_KEYS.theme)
    if (theme === 'light' || theme === 'dark' || theme === 'system') result.theme = theme

    const provider = localStorage.getItem(LEGACY_KEYS.defaultProvider)
    if (provider === 'openai' || provider === 'anthropic' || provider === 'google' || provider === 'copilot' || provider === 'openrouter' || provider === 'ollama') result.defaultProvider = provider

    const model = localStorage.getItem(LEGACY_KEYS.defaultModel)
    if (model) result.defaultModel = model

    const font = localStorage.getItem(LEGACY_KEYS.fontFamily)
    if (font === 'pretendard' || font === 'system') result.fontFamily = font

    const sendKey = localStorage.getItem(LEGACY_KEYS.sendKey)
    if (sendKey === 'enter' || sendKey === 'ctrl-enter') result.sendKey = sendKey

    const spellCheck = localStorage.getItem(LEGACY_KEYS.spellCheck)
    if (spellCheck === 'true') result.spellCheck = true
    else if (spellCheck === 'false') result.spellCheck = false

    const autoCap = localStorage.getItem(LEGACY_KEYS.autoCapitalization)
    if (autoCap === 'true') result.autoCapitalization = true
    else if (autoCap === 'false') result.autoCapitalization = false

    const notifications = localStorage.getItem(LEGACY_KEYS.notificationsEnabled)
    if (notifications === 'true') result.notificationsEnabled = true
    else if (notifications === 'false') result.notificationsEnabled = false

    const userName = localStorage.getItem(LEGACY_KEYS.userName)
    if (userName !== null) result.userName = userName

    const language = localStorage.getItem(LEGACY_KEYS.language)
    if (language === 'ko' || language === 'en') result.language = language

    const thinking = localStorage.getItem(LEGACY_KEYS.thinkingLevel)
    if (thinking === 'off' || thinking === 'low' || thinking === 'medium' || thinking === 'high') result.thinkingLevel = thinking

    const historyLimit = localStorage.getItem(LEGACY_KEYS.chatHistoryLimit)
    if (historyLimit) result.chatHistoryLimit = Number(historyLimit)

    // 마이그레이션 후 기존 키 정리
    for (const key of Object.values(LEGACY_KEYS)) {
      localStorage.removeItem(key)
    }
  } catch {
    // localStorage 접근 실패 무시
  }
  return result
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system' as Theme,
      defaultProvider: 'openai' as ProviderType,
      defaultModel: DEFAULT_MODELS['openai'],
      fontFamily: 'pretendard' as FontFamily,
      sendKey: 'enter' as SendKey,
      spellCheck: true,
      autoCapitalization: true,
      notificationsEnabled: true,
      userName: '',
      language: 'ko' as Language,
      thinkingLevel: 'medium' as ThinkingLevel,
      chatHistoryLimit: 10,

      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },
      setDefaultProvider: (provider) => {
        const model = DEFAULT_MODELS[provider]
        set({ defaultProvider: provider, defaultModel: model })
      },
      setDefaultModel: (model) => {
        set({ defaultModel: model })
      },
      setFontFamily: (fontFamily) => {
        applyFont(fontFamily)
        set({ fontFamily })
      },
      setSendKey: (sendKey) => {
        set({ sendKey })
      },
      setSpellCheck: (spellCheck) => {
        set({ spellCheck })
      },
      setAutoCapitalization: (autoCapitalization) => {
        set({ autoCapitalization })
      },
      setNotificationsEnabled: (notificationsEnabled) => {
        set({ notificationsEnabled })
      },
      setUserName: (userName) => {
        set({ userName })
      },
      setLanguage: (language) => {
        set({ language })
      },
      setThinkingLevel: (thinkingLevel) => {
        set({ thinkingLevel })
      },
      setChatHistoryLimit: (chatHistoryLimit) => {
        const clamped = Math.max(2, Math.min(100, chatHistoryLimit))
        try { window.assistantDesktop?.setChatHistoryLimit(clamped) } catch { /* 무시 */ }
        set({ chatHistoryLimit: clamped })
      },
    }),
    {
      name: 'sap-ops-settings',
      version: 1,
      partialize: (state) => ({
        theme: state.theme,
        defaultProvider: state.defaultProvider,
        defaultModel: state.defaultModel,
        fontFamily: state.fontFamily,
        sendKey: state.sendKey,
        spellCheck: state.spellCheck,
        autoCapitalization: state.autoCapitalization,
        notificationsEnabled: state.notificationsEnabled,
        userName: state.userName,
        language: state.language,
        thinkingLevel: state.thinkingLevel,
        chatHistoryLimit: state.chatHistoryLimit,
      }),
      migrate: (persisted) => {
        // 기존 분산 키에서 통합 마이그레이션
        const state = persisted as Partial<Record<string, unknown>>
        const legacy = migrateLegacySettings()
        return { ...state, ...legacy }
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme)
          applyFont(state.fontFamily)
        }
      },
    }
  )
)
