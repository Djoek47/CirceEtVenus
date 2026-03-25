export type SearchResult = {
  title?: string
  link: string
  snippet?: string
}

export interface WebSearchProvider {
  search(query: string, opts?: { limit?: number; page?: number }): Promise<SearchResult[]>
}

export class SerperProvider implements WebSearchProvider {
  private apiKey: string
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async search(query: string, opts?: { limit?: number; page?: number }): Promise<SearchResult[]> {
    const limit = Math.min(Math.max(opts?.limit ?? 10, 1), 20)
    const page = Math.min(Math.max(opts?.page ?? 1, 1), 10)
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: limit, page }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Search provider error (${res.status}): ${text.slice(0, 200)}`)
    }

    const data: any = await res.json()
    const organic: any[] = Array.isArray(data?.organic) ? data.organic : []
    return organic
      .map((r) => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet,
      }))
      .filter((r) => typeof r.link === 'string' && r.link.length > 0)
  }
}

