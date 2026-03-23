import { useState, useCallback } from 'react'
import { Upload, FileText, Send } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../hooks/queryKeys.js'
import { Button } from '../ui/Button.js'
import './ManualEmailInput.css'

const api = window.assistantDesktop

interface ManualEmailInputProps {
  onImported?: () => void
}

export function ManualEmailInput({ onImported }: ManualEmailInputProps) {
  const [subject, setSubject] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const queryClient = useQueryClient()

  const importMutation = useMutation({
    mutationFn: (input: { subject: string; bodyText: string }) =>
      api.emailManualImport(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.email.inbox() })
      setSubject('')
      setBodyText('')
      onImported?.()
    },
  })

  const handleSubmit = () => {
    if (!subject.trim() || !bodyText.trim()) return
    importMutation.mutate({ subject: subject.trim(), bodyText: bodyText.trim() })
  }

  const parseEmlContent = useCallback((text: string) => {
    // 간단한 .eml 파싱: Subject 헤더와 본문 분리
    const lines = text.split(/\r?\n/)
    let parsedSubject = ''
    let headerEnd = -1

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.toLowerCase().startsWith('subject:')) {
        parsedSubject = line.slice('subject:'.length).trim()
      }
      if (line.trim() === '') {
        headerEnd = i
        break
      }
    }

    const body = headerEnd >= 0 ? lines.slice(headerEnd + 1).join('\n').trim() : text
    setSubject(parsedSubject || '(제목 없음)')
    setBodyText(body)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      if (file.name.endsWith('.eml')) {
        parseEmlContent(text)
      } else {
        setSubject(file.name)
        setBodyText(text)
      }
    }
    reader.readAsText(file)
  }, [parseEmlContent])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  return (
    <div className="manual-email-input">
      <div className="manual-email-header">
        <FileText size={16} aria-hidden="true" />
        <span>이메일 수동 입력</span>
      </div>

      <div
        className={`manual-email-drop-zone ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload size={24} className="drop-zone-icon" aria-hidden="true" />
        <p>.eml 파일을 여기에 드래그하거나, 아래에 직접 붙여넣으세요</p>
      </div>

      <div className="manual-email-fields">
        <input
          type="text"
          className="manual-email-subject"
          placeholder="제목"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          aria-label="이메일 제목"
        />
        <textarea
          className="manual-email-body"
          placeholder="이메일 본문을 붙여넣으세요..."
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          rows={8}
          aria-label="이메일 본문"
        />
      </div>

      <div className="manual-email-actions">
        <Button
          onClick={handleSubmit}
          disabled={!subject.trim() || !bodyText.trim() || importMutation.isPending}
          aria-busy={importMutation.isPending}
        >
          <Send size={14} aria-hidden="true" />
          {importMutation.isPending ? '저장 중...' : '이메일 저장'}
        </Button>
        {importMutation.isSuccess && (
          <span className="manual-email-success">저장 완료!</span>
        )}
        {importMutation.isError && (
          <span className="manual-email-error">저장 실패. 다시 시도해주세요.</span>
        )}
      </div>
    </div>
  )
}
