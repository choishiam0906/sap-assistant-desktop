import type { DesktopApi } from '../preload/index'

declare global {
  /** Vite define으로 빌드 시 주입 — package.json version */
  const __APP_VERSION__: string

  interface Window {
    assistantDesktop: DesktopApi
  }
}
