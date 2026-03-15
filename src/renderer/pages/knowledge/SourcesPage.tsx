import { useState } from 'react'
import { FolderSearch, PlugZap } from 'lucide-react'
import { Badge } from '../../components/ui/Badge.js'
import { useWorkspaceStore, DOMAIN_PACK_DETAILS } from '../../stores/workspaceStore.js'
import { KnLocalFolderTab } from './sources/KnLocalFolderTab.js'
import { KnMcpTab } from './sources/KnMcpTab.js'
import '../SourcesPage.css'

export function SourcesPage() {
  const [activeSourceType, setActiveSourceType] = useState<'local-folder' | 'mcp'>('local-folder')

  const domainPack = useWorkspaceStore((state) => state.domainPack)
  const packDetail = DOMAIN_PACK_DETAILS[domainPack]

  return (
    <div className="sources-page">
      <div className="sources-type-bar">
        <div className="sources-type-toggle" role="group" aria-label="소스 타입 선택">
          <button
            type="button"
            className={`sources-type-btn ${activeSourceType === 'local-folder' ? 'active' : ''}`}
            onClick={() => setActiveSourceType('local-folder')}
          >
            <FolderSearch size={14} aria-hidden="true" />
            로컬 폴더
          </button>
          <button
            type="button"
            className={`sources-type-btn ${activeSourceType === 'mcp' ? 'active' : ''}`}
            onClick={() => setActiveSourceType('mcp')}
          >
            <PlugZap size={14} aria-hidden="true" />
            MCP
          </button>
        </div>
        <div className="sources-badges">
          <Badge variant="success">엔터프라이즈 보호</Badge>
          <Badge variant="neutral">{packDetail.label}</Badge>
        </div>
      </div>

      {activeSourceType === 'local-folder' && <KnLocalFolderTab domainPack={domainPack} />}
      {activeSourceType === 'mcp' && <KnMcpTab domainPack={domainPack} />}
    </div>
  )
}
