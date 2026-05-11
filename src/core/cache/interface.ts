import type { SearchResult } from '../types.js'

export interface CacheEntry {
  queryText: string
  results: SearchResult[]
  createdAt: Date
}

export interface SemanticCache {
  init(): Promise<void>
  lookup(queryEmbedding: number[], similarityThreshold?: number): Promise<CacheEntry | null>
  store(queryText: string, queryEmbedding: number[], results: SearchResult[]): Promise<void>
  // Returns count of deleted entries
  cleanExpired(ttlSeconds?: number): Promise<number>
  clear(): Promise<void>
}
