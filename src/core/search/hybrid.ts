import type { PGlite } from '@electric-sql/pglite'
import { vectorSearch } from './vector.js'
import { keywordSearch } from './keyword.js'
import type { SearchResult } from '../types.js'

// RRF constant k=60 (Cormack et al. 2009).
// score(d) = Σ_i 1/(k + rank_i(d))
const RRF_K = 60

export interface HybridWeights {
  // Multipliers applied to each retriever's RRF contribution.
  // Default: vector=1, keyword=1 (equal weight).
  // event intent → keyword=1.5 to favour exact-term matches.
  vector?: number
  keyword?: number
}

export class HybridSearch {
  constructor(private readonly db: PGlite) {}

  async search(
    queryEmbedding: number[],
    queryText: string,
    limit: number,
    weights: HybridWeights = {},
  ): Promise<SearchResult[]> {
    const vw = weights.vector  ?? 1.0
    const kw = weights.keyword ?? 1.0

    // Over-fetch to ensure good fusion coverage before budget enforcement
    const fetchLimit = Math.min(limit * 3, 50)

    const [vectorResults, keywordResults] = await Promise.all([
      vectorSearch(this.db, queryEmbedding, fetchLimit),
      keywordSearch(this.db, queryText, fetchLimit),
    ])

    // Accumulate weighted RRF scores per document id
    const scores = new Map<string, {
      score: number
      vectorRank?: number
      keywordRank?: number
    }>()

    for (const r of vectorResults) {
      const entry = scores.get(r.id) ?? { score: 0 }
      entry.score += vw * (1.0 / (RRF_K + r.rank))
      entry.vectorRank = r.rank
      scores.set(r.id, entry)
    }

    for (const r of keywordResults) {
      const entry = scores.get(r.id) ?? { score: 0 }
      entry.score += kw * (1.0 / (RRF_K + r.rank))
      entry.keywordRank = r.rank
      scores.set(r.id, entry)
    }

    // Build page lookup from both result lists (union)
    const pageMap = new Map<string, {
      id: string; title: string; content: string; metadata: Record<string, unknown>
    }>()
    for (const r of vectorResults) {
      pageMap.set(r.id, { id: r.id, title: r.title, content: r.content, metadata: r.metadata })
    }
    for (const r of keywordResults) {
      if (!pageMap.has(r.id)) {
        pageMap.set(r.id, { id: r.id, title: r.title, content: r.content, metadata: r.metadata })
      }
    }

    return [...scores.entries()]
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, limit)
      .map(([id, info]) => {
        const p = pageMap.get(id)!
        return {
          page: {
            id: p.id,
            title: p.title,
            content: p.content,
            metadata: p.metadata,
            createdAt: new Date(0),
            updatedAt: new Date(0),
          },
          score: info.score,
          vectorRank: info.vectorRank,
          keywordRank: info.keywordRank,
        }
      })
  }
}
