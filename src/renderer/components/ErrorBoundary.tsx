import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <AlertTriangle size={48} />
          <h2>예상치 못한 오류가 발생했어요</h2>
          <p className="error-boundary-message">
            {this.state.error?.message ?? '알 수 없는 오류'}
          </p>
          <button className="error-boundary-retry" onClick={this.handleReset}>
            <RotateCcw size={16} />
            다시 시도하기
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
