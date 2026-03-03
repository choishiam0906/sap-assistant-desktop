import './History.css'

export const History: React.FC = () => {
  return (
    <div className="history">
      <h2 className="page-title">대화 이력</h2>
      <div className="placeholder-card">
        <div className="placeholder-icon">💬</div>
        <h3>준비 중이에요</h3>
        <p>
          대화 이력 조회 기능은 Phase 1.5에서 제공될 예정이에요.
          <br />
          Teams에서 SAP 운영봇과 나눈 대화 내역을 확인할 수 있게 됩니다.
        </p>
      </div>
    </div>
  )
}
