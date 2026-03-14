import type { DesktopApi } from '../preload/index'

declare global {
  interface Window {
    sapOpsDesktop: DesktopApi
  }
}
