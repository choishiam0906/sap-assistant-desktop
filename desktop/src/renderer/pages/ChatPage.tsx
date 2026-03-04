import { useState, useEffect, useRef } from 'react'
import type { ChatSession, ChatMessage, ProviderType } from '../../main/contracts.js'
import './ChatPage.css'

const api = window.sapOpsDesktop

export function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [provider, setProvider] = useState<ProviderType>('codex')
  const [model, setModel] = useState('gpt-4.1-mini')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadSessions() {
    try {
      const list = await api.listSessions(50)
      setSessions(Array.isArray(list) ? list : [])
    } catch {
      setSessions([])
    }
  }

  async function selectSession(session: ChatSession) {
    setCurrentSession(session)
    try {
      const msgs = await api.getSessionMessages(session.id, 100)
      setMessages(Array.isArray(msgs) ? msgs : [])
    } catch {
      setMessages([])
    }
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return

    setSending(true)
    try {
      const result = await api.sendMessage({
        sessionId: currentSession?.id,
        provider,
        model,
        message: text,
      })
      setInput('')
      setCurrentSession(result.session)
      setMessages((prev) => [...prev, result.userMessage, result.assistantMessage])
      await loadSessions()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '메시지 전송에 실패했어요'
      alert(msg)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function startNewChat() {
    setCurrentSession(null)
    setMessages([])
    setInput('')
  }

  return (
    <div className="chat-layout">
      <div className="chat-sidebar">
        <button className="btn-primary new-chat-btn" onClick={startNewChat}>
          새 대화
        </button>
        <div className="session-list">
          {sessions.map((s) => (
            <button
              key={s.id}
              className={`session-item ${currentSession?.id === s.id ? 'active' : ''}`}
              onClick={() => selectSession(s)}
            >
              <span className="session-title">{s.title || '새 대화'}</span>
              <span className="session-date">
                {new Date(s.updatedAt).toLocaleDateString('ko-KR')}
              </span>
            </button>
          ))}
          {sessions.length === 0 && (
            <div className="session-empty">대화 이력이 없어요</div>
          )}
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <h2>SAP 운영에 대해 질문해보세요</h2>
              <p>T-code, 에러 분석, 권한 관리 등 무엇이든 물어보세요</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <div className="message-bubble">
                  <div className="message-content">{msg.content}</div>
                </div>
                <span className="message-time">
                  {new Date(msg.createdAt).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <div className="chat-options">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as ProviderType)}
              className="chat-select"
              aria-label="Provider 선택"
            >
              <option value="codex">Codex</option>
              <option value="copilot">Copilot</option>
            </select>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="chat-model-input"
              placeholder="모델명"
              aria-label="모델명 입력"
            />
          </div>
          <div className="chat-input-row">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요... (Enter로 전송)"
              className="chat-textarea"
              disabled={sending}
              rows={2}
            />
            <button
              className="btn-primary send-btn"
              onClick={handleSend}
              disabled={sending || !input.trim()}
            >
              {sending ? '전송 중...' : '전송'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
