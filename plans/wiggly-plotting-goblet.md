# v7.0 브랜딩 리뉴얼 — SAP 잔재 정리 + 앱 아이콘 교체 + 아이콘 일관성

## Context

v6.1에서 "SAP Assistant Desktop Platform → Assistant Desktop" 범용 플랫폼 전환이 완료되었으나, 빌드 아티팩트명, 파일/디렉토리명, 이모지 혼용 등 SAP 잔재가 남아있다. v7.0 기능 추가와 함께 브랜딩을 완전히 정리한다.

**목표**:
1. 코드베이스에서 "SAP" 참조 완전 제거 (Domain Pack 제외)
2. 앱 아이콘을 기하학적 연결 노드 패턴으로 교체
3. Sidebar 서브메뉴 이모지를 lucide 아이콘으로 통일

---

## Phase 1: SAP 잔재 완전 정리

### 1-1. package.json 빌드 메타데이터 (4줄)

**파일**: `package.json`

| 위치 | 현재 | 변경 |
|------|------|------|
| NSIS artifactName | `SAP-Assistant-Desktop-Platform-${version}-Setup.exe` | `Assistant-Desktop-${version}-Setup.exe` |
| NSIS shortcutName | `SAP Assistant Desktop Platform` | `Assistant Desktop` |
| portable artifactName | `SAP-Assistant-Desktop-Platform-${version}-Portable.exe` | `Assistant-Desktop-${version}-Portable.exe` |
| publish repo | `sap-assistant-desktop` | `assistant-desktop` |

### 1-2. SapAssistantPage → AssistantPage 리네임

**삭제**: `src/renderer/pages/SapAssistantPage.tsx`
**삭제**: `src/renderer/pages/AskSapPage.tsx` (deprecated re-export)

**신규**: `src/renderer/pages/AssistantPage.tsx`
- 함수명 `SapAssistantPage` → `AssistantPage`
- 내부 로직 변경 없음

**수정 파일**:
| 파일 | 변경 |
|------|------|
| `src/renderer/App.tsx` (L6, L31) | import `AssistantPage` from `./pages/AssistantPage` |

### 1-3. askSapStore → assistantStore 리네임

**삭제**: `src/renderer/stores/askSapStore.ts`

**신규**: `src/renderer/stores/assistantStore.ts`
- `useAskSapStore` → `useAssistantStore`
- `AskSapState` → `AssistantState`
- `SessionFilterTab` 타입 유지

**수정 파일**:
| 파일 | 변경 |
|------|------|
| `src/renderer/pages/assistant/ChatMode.tsx` (L5-6) | import from `../../stores/assistantStore.js` |
| `src/renderer/pages/ask-sap/SessionListPanel.tsx` (L6-7) | import from `../../stores/assistantStore.js` |

### 1-4. ask-sap/ → chat/ 디렉토리 이동

`src/renderer/pages/ask-sap/` → `src/renderer/pages/chat/`

이동 대상 파일 (9개):
- `ChatDetail.tsx`, `ChatHeader.tsx`, `EmptyState.tsx`
- `ExecutionMetaPanel.tsx`, `SessionListPanel.tsx`
- `SkillSelector.tsx`, `SkillsPanel.tsx`, `SourceSelector.tsx`
- `StreamingIndicator.tsx`

**수정 파일** (import 경로 변경):
| 파일 | 변경 |
|------|------|
| `src/renderer/pages/assistant/ChatMode.tsx` (L8-9) | `../ask-sap/` → `../chat/` |

> **참고**: `ask-sap/` 내부 파일 간 상호 import는 상대 경로 `./`이므로 디렉토리 이동해도 변경 불필요.

### 1-5. Sidebar 버전 업데이트

**파일**: `src/renderer/components/Sidebar.tsx` (L109)
- `v6.0` → `v7.0`

### 1-6. Deprecated alias 정리 (선택적)

현재 `contracts.ts`, `preload/index.ts`, `global.d.ts`에 deprecated alias가 있음.
v7.0에서 한 버전 더 유지하되, 다음 메이저 버전에서 제거 예정으로 표시.
→ **이번에는 유지** (호환성)

---

## Phase 2: 앱 아이콘 교체

### 2-1. icon.svg 새 디자인

**파일**: `build/icon.svg` (덮어쓰기)

**디자인 컨셉**: 기하학적 연결 노드 패턴
- 256×256 rounded rect 배경 (현재 파란색 그라데이션 계열 유지)
- 3개의 노드(원형) + 연결선으로 워크플로우/네트워크 표현
- 중앙 노드 살짝 크게 → AI 허브 느낌
- 선은 반투명 white로 네트워크 연결감
- 우하단에 작은 스파크 장식 (AI 느낌)

**SVG 구조**:
```
배경: roundedRect + linearGradient (#13293D → #1B6FEF → #4DA8FF)
노드1: circle cx=96 cy=88 r=22 (좌상)
노드2: circle cx=160 cy=88 r=22 (우상)
노드3: circle cx=128 cy=160 r=28 (중하, 메인 허브)
연결선: path로 3개 노드 연결 (흰색 반투명)
스파크: 작은 diamond/star 장식 (우하)
```

### 2-2. PNG/ICO 생성

**icon.svg → icon.png**: PowerShell + System.Drawing 또는 sharp npm 사용
**icon.svg → icon.ico**: png-to-ico npm 또는 ImageMagick

스크립트 없이 수동 변환:
```bash
npx sharp-cli -i build/icon.svg -o build/icon.png resize 256 256
npx png-to-ico build/icon.png > build/icon.ico
```

또는 Electron이 SVG→PNG 자동 처리하는 경우 icon.png만 업데이트.

---

## Phase 3: lucide 아이콘 일관성 정리

### 3-1. NavItemGroup 확장 — children 아이콘 지원

**파일**: `src/renderer/components/sidebar/NavItemGroup.tsx`

`NavChild` 인터페이스에 `Icon` 옵션 추가:
```typescript
export interface NavChild {
  id: string
  subPage: string
  label: string
  Icon?: LucideIcon  // 추가
}
```

렌더링 시 Icon이 있으면 `.nav-child-dot` 대신 아이콘 표시:
```tsx
{child.Icon
  ? <child.Icon size={14} className="nav-child-icon" aria-hidden="true" />
  : <span className="nav-child-dot" />
}
```

### 3-2. Sidebar 서브메뉴 이모지 → lucide 아이콘 교체

**파일**: `src/renderer/components/Sidebar.tsx`

**Assistant 서브메뉴**:
| 현재 | 변경 | lucide 아이콘 |
|------|------|-------------|
| `💬 대화` | `대화` | `MessageCircle` |
| `중요 세션` | `중요 세션` | `Star` |
| `보관함` | `보관함` | `Archive` |

**Knowledge 서브메뉴**:
| 현재 | 변경 | lucide 아이콘 |
|------|------|-------------|
| `📐 프로세스` | `프로세스` | `Workflow` |
| `⚡ 스킬` | `스킬` | `Zap` |
| `🤖 에이전트` | `에이전트` | `Bot` |
| `🔐 볼트` | `볼트` | `Lock` |
| `🧪 코드 랩` | `코드 랩` | `FlaskConical` |

**Cockpit 서브메뉴** (현재 아이콘 없음, 추가):
| 항목 | lucide 아이콘 |
|------|-------------|
| Overview | `BarChart3` |
| Daily Tasks | `ListTodo` |
| 월별 마감 | `CalendarDays` |
| 연간 마감 | `CalendarRange` |
| 전체 Plan | `ClipboardList` |

### 3-3. 메인 사이드바 아이콘 점검

| 섹션 | 현재 | 변경 | 이유 |
|------|------|------|------|
| Cockpit | `LayoutDashboard` | 유지 | 적절 |
| 어시스턴트 | `MessageSquare` | `Sparkles` | AI 느낌 강화 |
| Knowledge | `BookOpen` | 유지 | 적절 |
| Email | `Mail` | 유지 | 적절 |
| Code Analysis | `Code2` | `ScanSearch` | 분석 느낌 강화 |
| Settings | `Settings` | 유지 | 적절 |

### 3-4. Sidebar.css 아이콘 스타일 추가

```css
.nav-child-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--color-text-muted);
}

.nav-child-item.active .nav-child-icon {
  color: var(--color-primary);
}
```

---

## 실행 순서

```
Phase 1 (순차, 의존성 있음):
  1-1. package.json 메타데이터 수정
  1-2. SapAssistantPage → AssistantPage 리네임 + App.tsx 수정
  1-3. askSapStore → assistantStore 리네임 + import 수정
  1-4. ask-sap/ → chat/ 디렉토리 이동 + import 수정
  1-5. Sidebar 버전 v7.0 업데이트
  → 중간 검증: npm run typecheck

Phase 2 (Phase 1 이후):
  2-1. icon.svg 새 디자인 작성
  2-2. icon.png, icon.ico 생성

Phase 3 (Phase 1 이후, Phase 2와 병렬 가능):
  3-1. NavItemGroup 확장 (Icon prop)
  3-2. Sidebar 서브메뉴 이모지 제거 + lucide 아이콘 매핑
  3-3. 메인 사이드바 아이콘 교체 (Sparkles, ScanSearch)
  3-4. CSS 스타일 추가

최종 검증:
  npm run typecheck && npm run lint && npm run test:run
```

---

## 수정 파일 요약

| # | 파일 | 작업 | Phase |
|---|------|------|-------|
| 1 | `package.json` | 아티팩트명/shortcut/repo 수정 | 1 |
| 2 | `src/renderer/pages/SapAssistantPage.tsx` | 삭제 → AssistantPage.tsx로 교체 | 1 |
| 3 | `src/renderer/pages/AskSapPage.tsx` | 삭제 | 1 |
| 4 | `src/renderer/pages/AssistantPage.tsx` | 신규 | 1 |
| 5 | `src/renderer/App.tsx` | import 경로 변경 | 1 |
| 6 | `src/renderer/stores/askSapStore.ts` | 삭제 → assistantStore.ts로 교체 | 1 |
| 7 | `src/renderer/stores/assistantStore.ts` | 신규 | 1 |
| 8 | `src/renderer/pages/assistant/ChatMode.tsx` | import 경로 변경 (store + chat/) | 1 |
| 9 | `src/renderer/pages/ask-sap/*.tsx` (9개) | chat/로 이동 | 1 |
| 10 | `src/renderer/components/Sidebar.tsx` | 버전 + 아이콘 매핑 | 1+3 |
| 11 | `src/renderer/components/sidebar/NavItemGroup.tsx` | NavChild Icon 지원 | 3 |
| 12 | `src/renderer/components/Sidebar.css` | 아이콘 스타일 추가 | 3 |
| 13 | `build/icon.svg` | 새 디자인 | 2 |
| 14 | `build/icon.png` | 재생성 | 2 |
| 15 | `build/icon.ico` | 재생성 | 2 |

**총 ~20개 파일** (디렉토리 이동 9개 포함)

---

## 검증

```bash
npm run typecheck   # 모든 tsconfig 통과
npm run lint        # ESLint 통과
npm run test:run    # 기존 테스트 깨짐 없음
npm run build       # 번들 정상 생성
```

수동 검증:
1. Electron 앱 실행 → 새 아이콘 확인 (타이틀바, 태스크바)
2. Sidebar 서브메뉴 → 이모지 대신 lucide 아이콘 표시 확인
3. Portable exe 빌드 → 파일명에 SAP 없음 확인
4. `Ctrl+Shift+I` → Console에 deprecated 경고 없음
