import { Info } from 'lucide-react'
import {
  SettingsSection,
  SettingsCard,
  SettingsToggle,
  SettingsRow,
} from '../../components/settings/primitives/index.js'
import { useSettingsStore } from '../../stores/settingsStore.js'

export function AppSettingsPage() {
  const { notificationsEnabled, setNotificationsEnabled, demoMode, setDemoMode } = useSettingsStore()

  return (
    <div className="sp-page page-enter">
      <div className="sp-page-header">
        <h3>App</h3>
      </div>
      <div className="sp-page-scroll">
        <div className="sp-page-body">
          <div className="sp-page-sections">

            <SettingsSection title="Notifications">
              <SettingsCard>
                <SettingsToggle
                  checked={notificationsEnabled}
                  onChange={setNotificationsEnabled}
                  label="데스크톱 알림"
                  description="AI 작업 완료 시 데스크톱 알림을 표시해요"
                />
              </SettingsCard>
            </SettingsSection>

            <SettingsSection title="데이터">
              <SettingsCard>
                <SettingsToggle
                  checked={demoMode}
                  onChange={setDemoMode}
                  label="데모 데이터 포함"
                  description="앱 시작 시 샘플 이메일과 플랜 데이터를 자동으로 생성해요 (다음 재시작부터 적용)"
                />
              </SettingsCard>
            </SettingsSection>

            <SettingsSection title="About">
              <SettingsCard>
                <SettingsRow label="Version">
                  <span className="row-value">v{__APP_VERSION__}</span>
                </SettingsRow>
                <SettingsRow label="Runtime">
                  <span className="row-value">Electron</span>
                </SettingsRow>
              </SettingsCard>
            </SettingsSection>

            <section className="settings-section">
              <div className="info-card">
                <Info size={16} className="info-card-icon" aria-hidden="true" />
                <p>업데이트 확인과 릴리즈 노트는 GitHub에서 확인할 수 있어요.</p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
