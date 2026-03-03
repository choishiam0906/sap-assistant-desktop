import { useEffect, useState } from 'react'
import { apiClient, type KnowledgeItem } from '../api/client'
import { KnowledgeForm } from '../components/KnowledgeForm'
import './Knowledge.css'

const CATEGORIES = ['전체', '데이터분석', '오류분석', '역할관리', 'CTS관리']

export const Knowledge: React.FC = () => {
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<KnowledgeItem | null>(null)

  const fetchItems = async () => {
    setLoading(true)
    try {
      const category = selectedCategory === '전체' ? undefined : selectedCategory
      const data = await apiClient.getKnowledge(category)
      // API가 { items: [...] } 또는 배열을 반환할 수 있음
      setItems(Array.isArray(data) ? data : (data as unknown as { items: KnowledgeItem[] }).items ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [selectedCategory])

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 지식 항목을 삭제하시겠어요?')) return
    try {
      await apiClient.deleteKnowledge(id)
      await fetchItems()
    } catch {
      alert('삭제에 실패했습니다')
    }
  }

  const handleEdit = (item: KnowledgeItem) => {
    setEditItem(item)
    setShowForm(true)
  }

  const handleSubmit = async (data: {
    title: string
    category: string
    tcode: string
    content?: string
  }) => {
    if (editItem) {
      await apiClient.updateKnowledge(editItem.id, data)
    } else {
      await apiClient.createKnowledge(data)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditItem(null)
    fetchItems()
  }

  return (
    <div className="knowledge">
      <div className="knowledge-header">
        <h2 className="page-title">지식 베이스 관리</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + 추가
        </button>
      </div>

      <div className="filter-bar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">등록된 지식이 없습니다</div>
      ) : (
        <div className="knowledge-table-wrapper">
          <table className="knowledge-table">
            <thead>
              <tr>
                <th>제목</th>
                <th>카테고리</th>
                <th>T-code</th>
                <th>수정일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="td-title">{item.title}</td>
                  <td>
                    <span className="category-badge">{item.category}</span>
                  </td>
                  <td className="td-tcode">{item.tcode || '-'}</td>
                  <td className="td-date">
                    {new Date(item.updated_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="td-actions">
                    <button className="btn-edit" onClick={() => handleEdit(item)}>
                      수정
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(item.id)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <KnowledgeForm
        isOpen={showForm}
        item={editItem ?? undefined}
        categories={CATEGORIES.filter((c) => c !== '전체')}
        onClose={handleFormClose}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
