const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export interface ApiResponse<T> {
  data: T
  message?: string
  status: number
}

export interface KnowledgeItem {
  id: string
  title: string
  category: string
  tcode: string
  content?: string
  updated_at: string
}

export interface Statistics {
  total_queries: number
  total_knowledge_items: number
  total_categories: number
  categories_distribution?: Record<string, number>
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error')
      throw new Error(`API Error: ${response.status} - ${error}`)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json() as Promise<T>
  }

  // Statistics endpoints
  async getStats(): Promise<Statistics> {
    return this.request<Statistics>('/stats')
  }

  // Knowledge endpoints
  async getKnowledge(category?: string): Promise<KnowledgeItem[]> {
    const params = new URLSearchParams()
    if (category) {
      params.append('category', category)
    }
    const query = params.toString()
    return this.request<KnowledgeItem[]>(
      `/knowledge${query ? `?${query}` : ''}`
    )
  }

  async getKnowledgeById(id: string): Promise<KnowledgeItem> {
    return this.request<KnowledgeItem>(`/knowledge/${id}`)
  }

  async createKnowledge(data: {
    title: string
    category: string
    tcode: string
    content?: string
  }): Promise<KnowledgeItem> {
    return this.request<KnowledgeItem>('/knowledge', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateKnowledge(
    id: string,
    data: {
      title?: string
      category?: string
      tcode?: string
      content?: string
    }
  ): Promise<KnowledgeItem> {
    return this.request<KnowledgeItem>(`/knowledge/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteKnowledge(id: string): Promise<void> {
    return this.request<void>(`/knowledge/${id}`, {
      method: 'DELETE',
    })
  }
}

export const apiClient = new ApiClient()
