export interface BrainPage {
  id: string
  title: string
  content: string
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface BrainPageInput {
  id?: string
  title: string
  content: string
  metadata?: Record<string, unknown>
}

export interface SearchResult {
  page: BrainPage
  score: number
  vectorRank?: number
  keywordRank?: number
  intent?: import('./search/intent.js').QueryIntent  // detected intent (populated when classification runs)
}

export interface SearchOptions {
  limit?: number
  tokenBudget?: number
  minScore?: number
  // Semantic cache controls
  skipCache?: boolean       // bypass cache lookup and storage for this query
  cacheThreshold?: number   // cosine similarity threshold for cache hit (default: 0.92)
  // Knowledge graph controls
  skipGraphBoost?: boolean  // bypass backlink boost for this query
  // Intent classification controls
  skipIntentClassification?: boolean  // bypass intent detection, use general hybrid search
}
