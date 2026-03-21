import type { DesktopApi } from '../preload/index'

declare global {
  interface Window {
    assistantDesktop: DesktopApi
    /** @deprecated Use assistantDesktop */
    sapOpsDesktop: DesktopApi
  }
}
