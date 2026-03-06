import { Activity, BookOpen, Cloud, Code2, Network, ShieldCheck, ShieldEllipsis, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from './ui/Badge.js'
import {
  DOMAIN_PACK_DETAILS,
  SECURITY_MODE_DETAILS,
  type DomainPack,
  type SecurityMode,
  useWorkspaceStore,
} from '../stores/workspaceStore.js'
import './WorkspaceBar.css'

const SECURITY_MODE_ICONS: Record<SecurityMode, LucideIcon> = {
  'secure-local': ShieldCheck,
  reference: BookOpen,
  'hybrid-approved': ShieldEllipsis,
}

const DOMAIN_PACK_ICONS: Record<DomainPack, LucideIcon> = {
  ops: Activity,
  functional: Users,
  'cbo-maintenance': Code2,
  'pi-integration': Network,
  'btp-rap-cap': Cloud,
}

export function WorkspaceBar() {
  const securityMode = useWorkspaceStore((state) => state.securityMode)
  const domainPack = useWorkspaceStore((state) => state.domainPack)
  const setSecurityMode = useWorkspaceStore((state) => state.setSecurityMode)
  const setDomainPack = useWorkspaceStore((state) => state.setDomainPack)

  const activeMode = SECURITY_MODE_DETAILS[securityMode]
  const activePack = DOMAIN_PACK_DETAILS[domainPack]

  return (
    <section className="workspace-bar page-enter" aria-label="Workspace control">
      <div className="workspace-header">
        <div className="workspace-copy">
          <span className="workspace-eyebrow">Workspace Control</span>
          <h2>질문 범위와 SAP 도메인을 먼저 고릅니다</h2>
          <p>
            이 설정은 현재 세션의 답변 톤과 외부 전송 정책을 함께 결정합니다.
          </p>
        </div>
        <div className="workspace-summary">
          <Badge variant={activeMode.badgeVariant}>{activeMode.label}</Badge>
          <Badge variant="neutral">{activePack.label}</Badge>
        </div>
      </div>

      <div className="workspace-grid">
        <section className="workspace-section" aria-labelledby="workspace-security-title">
          <div className="workspace-section-head">
            <span className="workspace-section-kicker">Security Mode</span>
            <h3 id="workspace-security-title">데이터 전송 경계</h3>
          </div>
          <div className="workspace-option-list">
            {(Object.entries(SECURITY_MODE_DETAILS) as Array<[SecurityMode, typeof activeMode]>).map(([mode, detail]) => {
              const Icon = SECURITY_MODE_ICONS[mode]
              return (
                <button
                  key={mode}
                  type="button"
                  className={`workspace-option ${securityMode === mode ? 'active' : ''}`}
                  onClick={() => setSecurityMode(mode)}
                >
                  <div className="workspace-option-top">
                    <div className="workspace-option-icon">
                      <Icon size={18} aria-hidden="true" />
                    </div>
                    <Badge variant={detail.badgeVariant}>{detail.label}</Badge>
                  </div>
                  <strong>{detail.outboundPolicy}</strong>
                  <p>{detail.description}</p>
                </button>
              )
            })}
          </div>
        </section>

        <section className="workspace-section" aria-labelledby="workspace-pack-title">
          <div className="workspace-section-head">
            <span className="workspace-section-kicker">Domain Pack</span>
            <h3 id="workspace-pack-title">업무 맥락 선택</h3>
          </div>
          <div className="workspace-pack-grid">
            {(Object.entries(DOMAIN_PACK_DETAILS) as Array<[DomainPack, typeof activePack]>).map(([pack, detail]) => {
              const Icon = DOMAIN_PACK_ICONS[pack]
              return (
                <button
                  key={pack}
                  type="button"
                  className={`workspace-pack-card ${domainPack === pack ? 'active' : ''}`}
                  onClick={() => setDomainPack(pack)}
                >
                  <div className="workspace-pack-icon">
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <strong>{detail.label}</strong>
                  <p>{detail.description}</p>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </section>
  )
}

