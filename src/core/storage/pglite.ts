import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { randomUUID } from 'crypto'
import type { BrainEngine } from '../engine.js'
import type { BrainPage, BrainPageInput, SearchResult, SearchOptions } from '../types.js'
import type { EmbeddingProvider } from '../embedding/interface.js'
import type { QueryExpander } from '../expand/interface.js'
import { NoOpExpander } from '../expand/noop.js'
import { HybridSearch } from '../search/hybrid.js'
import { vectorSearch } from '../search/vector.js'
import { classifyIntent } from '../search/intent.js'
import type { IntentResult } from '../search/intent.js'
import { TokenCounter } from '../token/counter.js'
import { TokenBudgetEnforcer, DEFAULT_TOKEN_BUDGET } from '../token/budget.js'
import { PGliteSemanticCache, DEFAULT_CACHE_THRESHOLD } from '../cache/pglite-cache.js'
import { PGliteKnowledgeGraph } from '../graph/pglite-graph.js'
import { BacklinkBooster, DEFAULT_BACKLINK_BOOST_FACTOR } from '../graph/boost.js'

export interface PGliteEngineOptions {
  dbPath?: string
  expander?: QueryExpander
  // Set false to disable semantic cache entirely
  cacheEnabled?: boolean
  cacheSimilarityThreshold?: number
  cacheTtlSeconds?: number
  // Set false to disable knowledge graph and backlink boost
  graphEnabled?: boolean
  backlinkBoostFactor?: number
}

interface DbRow {
  id: string
  title: string
  content: string
  metadata: Record<string, unknown> | string
  created_at: string
  updated_at: string
}

function rowToPage(row: DbRow): BrainPage {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    metadata: typeof row.metadata === 'string'
      ? (JSON.parse(row.metadata) as Record<string, unknown>)
      : row.metadata,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

// RRF merge for multi-expansion search results.
// Each list is already RRF-scored (vector+keyword). This second RRF pass
// promotes documents that rank highly across multiple query variants.
const EXPANSION_RRF_K = 60

function mergeExpansionResults(allResults: SearchResult[][], limit: number): SearchResult[] {
  const scores = new Map<string, { score: number; result: SearchResult }>()

  for (const results of allResults) {
    for (let rank = 0; rank < results.length; rank++) {
      const r = results[rank]
      const id = r.page.id
      const entry = scores.get(id)
      if (entry) {
        entry.score += 1.0 / (EXPANSION_RRF_K + rank + 1)
      } else {
        scores.set(id, { score: 1.0 / (EXPANSION_RRF_K + rank + 1), result: r })
      }
    }
  }

  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(e => ({ ...e.result, score: e.score }))
}

export class PGliteEngine implements BrainEngine {
  private db!: PGlite
  private hybridSearch!: HybridSearch
  private cache: PGliteSemanticCache | null = null
  private graph: PGliteKnowledgeGraph | null = null

  private readonly dbPath: string
  private readonly expander: QueryExpander
  private readonly cacheEnabled: boolean
  private readonly cacheSimilarityThreshold: number
  private readonly cacheTtlSeconds: number
  private readonly graphEnabled: boolean
  private readonly backlinkBoostFactor: number
  private readonly tokenCounter: TokenCounter
  private readonly budgetEnforcer: TokenBudgetEnforcer
  private readonly backlinkBooster: BacklinkBooster

  constructor(
    private readonly embedding: EmbeddingProvider,
    options: PGliteEngineOptions = {},
  ) {
    this.dbPath = options.dbPath ?? './brain.pglite'
    this.expander = options.expander ?? new NoOpExpander()
    this.cacheEnabled = options.cacheEnabled !== false  // default: enabled
    this.cacheSimilarityThreshold = options.cacheSimilarityThreshold ?? DEFAULT_CACHE_THRESHOLD
    this.cacheTtlSeconds = options.cacheTtlSeconds ?? 3600
    this.graphEnabled = options.graphEnabled !== false   // default: enabled
    this.backlinkBoostFactor = options.backlinkBoostFactor ?? DEFAULT_BACKLINK_BOOST_FACTOR
    this.tokenCounter = new TokenCounter()
    this.budgetEnforcer = new TokenBudgetEnforcer(this.tokenCounter)
    this.backlinkBooster = new BacklinkBooster()
  }

  async init(): Promise<void> {
    this.db = new PGlite(this.dbPath, { extensions: { vector } })

    await this.db.exec('CREATE EXTENSION IF NOT EXISTS vector')

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS brain_pages (
        id          TEXT PRIMARY KEY,
        title       TEXT NOT NULL,
        content     TEXT NOT NULL,
        embedding   vector(${this.embedding.dimensions}),
        metadata    JSONB NOT NULL DEFAULT '{}',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    // HNSW: m=16 (max edges/node), ef_construction=64 (build-time beam width).
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS brain_pages_hnsw_idx
        ON brain_pages USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    `)

    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS brain_pages_fts_idx
        ON brain_pages
        USING gin(to_tsvector('english', title || ' ' || content))
    `)

    this.hybridSearch = new HybridSearch(this.db)

    // Cache requires real embeddings — disable automatically in keyword-only mode
    if (this.cacheEnabled && this.embedding.model !== 'none') {
      this.cache = new PGliteSemanticCache(this.db, this.embedding.dimensions)
      await this.cache.init()
    }

    if (this.graphEnabled) {
      this.graph = new PGliteKnowledgeGraph(this.db)
      await this.graph.init()
    }
  }

  async put(input: BrainPageInput): Promise<BrainPage> {
    const id = input.id ?? randomUUID()
    const embedText = `${input.title}\n${input.content}`
    const embedding = await this.embedding.embed(embedText)
    const metadata = input.metadata ?? {}

    if (embedding.length > 0) {
      const vec = `[${embedding.join(',')}]`
      await this.db.query(
        `INSERT INTO brain_pages (id, title, content, embedding, metadata)
         VALUES ($1, $2, $3, $4::vector, $5::jsonb)
         ON CONFLICT (id) DO UPDATE
           SET title      = EXCLUDED.title,
               content    = EXCLUDED.content,
               embedding  = EXCLUDED.embedding,
               metadata   = EXCLUDED.metadata,
               updated_at = NOW()`,
        [id, input.title, input.content, vec, JSON.stringify(metadata)]
      )
    } else {
      // keyword-only mode — store NULL embedding
      await this.db.query(
        `INSERT INTO brain_pages (id, title, content, embedding, metadata)
         VALUES ($1, $2, $3, NULL, $4::jsonb)
         ON CONFLICT (id) DO UPDATE
           SET title      = EXCLUDED.title,
               content    = EXCLUDED.content,
               embedding  = NULL,
               metadata   = EXCLUDED.metadata,
               updated_at = NOW()`,
        [id, input.title, input.content, JSON.stringify(metadata)]
      )
    }

    if (this.graph) {
      await this.graph.extractAndStore(id, input.title, input.content)
    }

    const page = await this.get(id)
    return page!
  }

  async get(id: string): Promise<BrainPage | null> {
    const result = await this.db.query<DbRow>(
      'SELECT id, title, content, metadata, created_at, updated_at FROM brain_pages WHERE id = $1',
      [id]
    )
    if (result.rows.length === 0) return null
    return rowToPage(result.rows[0])
  }

  async search(query: string, opts: SearchOptions = {}): Promise<SearchResult[]> {
    const limit = opts.limit ?? 20
    const budget = opts.tokenBudget ?? DEFAULT_TOKEN_BUDGET
    const threshold = opts.cacheThreshold ?? this.cacheSimilarityThreshold
    const useCache = this.cache !== null && !opts.skipCache

    // 1. Embed the original query (empty array = keyword-only mode)
    const queryEmbedding = await this.embedding.embed(query)
    const hasEmbedding = queryEmbedding.length > 0

    // 2. Semantic cache lookup — requires embeddings
    if (useCache && hasEmbedding) {
      const cached = await this.cache!.lookup(queryEmbedding, threshold)
      if (cached) {
        return this.budgetEnforcer.enforce(cached.results, budget)
      }
    }

    // 3. Intent classification — zero-LLM, drives search strategy
    const intent: IntentResult = opts.skipIntentClassification
      ? { intent: 'general', confidence: 1, signals: [] }
      : classifyIntent(query)

    // Intent → hybrid search weights
    // event queries are keyword-heavy; entity/temporal use defaults
    const hybridWeights = intent.intent === 'event'
      ? { vector: 0.8, keyword: 1.5 }
      : { vector: 1.0, keyword: 1.0 }

    // 4. Query expansion (NoOp by default — zero extra token cost)
    const expansions = await this.expander.expand(query)

    // 5. Search: single path or multi-expansion RRF merge
    let results: SearchResult[]

    if (expansions.length === 1) {
      results = await this.hybridSearch.search(queryEmbedding, query, limit, hybridWeights)
    } else {
      const allResults = await Promise.all(
        expansions.map(async (q, i) => {
          const emb = i === 0 ? queryEmbedding : (hasEmbedding ? await this.embedding.embed(q) : [])
          return this.hybridSearch.search(emb, q, limit, hybridWeights)
        })
      )
      results = mergeExpansionResults(allResults, limit)
    }

    // 6. Entity intent: boost pages that contain matching graph entities
    if (intent.intent === 'entity' && this.graph) {
      results = await this._applyEntityBoost(query, results)
    }

    // 7. Temporal / event intent: blend in recency score
    if ((intent.intent === 'temporal' || intent.intent === 'event') && results.length > 0) {
      results = await this._applyRecencyBoost(results)
    }

    // 8. Min score filter
    const filtered = opts.minScore
      ? results.filter(r => r.score >= opts.minScore!)
      : results

    // 9. Backlink boost — re-rank before budget enforcement so highly-linked pages are prioritized
    let ranked = filtered
    if (this.graph && !opts.skipGraphBoost) {
      const pages = filtered.map(r => ({ id: r.page.id, title: r.page.title }))
      const counts = await this.graph.getBacklinkCounts(pages)
      ranked = this.backlinkBooster.boost(filtered, counts, this.backlinkBoostFactor)
    }

    // 10. Token budget enforcement
    const budgeted = this.budgetEnforcer.enforce(ranked, budget)

    // 11. Stamp detected intent onto results (useful for callers / MCP tools)
    const stamped = budgeted.map(r => ({ ...r, intent: intent.intent }))

    // 12. Cache the budgeted results for future similar queries (requires embeddings)
    if (useCache && hasEmbedding) {
      await this.cache!.store(query, queryEmbedding, stamped)
    }

    return stamped
  }

  // ── Intent helpers ──────────────────────────────────────────────────────────

  // Entity boost: for each entity extracted from the query (wikilinks, hashtags, mentions),
  // look up pages that contain that entity in the knowledge graph.
  // Matching pages not already in results are injected; all matching pages get a +30% score boost.
  private async _applyEntityBoost(query: string, results: SearchResult[]): Promise<SearchResult[]> {
    if (!this.graph) return results

    const { extractEntities } = await import('../graph/extractor.js')
    const entities = extractEntities(query)
    if (entities.length === 0) return results

    const boostedIds = new Set<string>()
    const injectIds = new Set<string>()
    const presentIds = new Set(results.map(r => r.page.id))

    for (const entity of entities) {
      const pageIds = await this.graph.findPagesByEntityValue(entity.type, entity.value)
      for (const pid of pageIds) {
        boostedIds.add(pid)
        if (!presentIds.has(pid)) injectIds.add(pid)
      }
    }

    // Boost existing results
    let boosted = results.map(r =>
      boostedIds.has(r.page.id) ? { ...r, score: r.score * 1.3 } : r
    )

    // Inject graph-matched pages not caught by hybrid search
    if (injectIds.size > 0) {
      const injected = await Promise.all(
        [...injectIds].map(id => this.get(id))
      )
      for (const page of injected) {
        if (page) {
          boosted.push({ page, score: 0.05, intent: 'entity' as const })
        }
      }
    }

    return boosted.sort((a, b) => b.score - a.score)
  }

  // Recency boost: fetch updated_at for result pages, compute exponential decay score,
  // blend with existing RRF score. Half-life ≈ 30 days.
  // final_score = rrf_score * (1 + RECENCY_FACTOR * exp(-days / 30))
  private async _applyRecencyBoost(results: SearchResult[]): Promise<SearchResult[]> {
    const RECENCY_FACTOR = 0.4
    const HALF_LIFE_DAYS = 30

    const ids = results.map(r => r.page.id)
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ')

    const rows = await this.db.query<{ id: string; updated_at: string }>(
      `SELECT id, updated_at FROM brain_pages WHERE id IN (${placeholders})`,
      ids
    )

    const updatedAtMap = new Map<string, Date>()
    for (const row of rows.rows) {
      updatedAtMap.set(row.id, new Date(row.updated_at))
    }

    const now = Date.now()
    return results
      .map(r => {
        const updatedAt = updatedAtMap.get(r.page.id)
        if (!updatedAt) return r
        const daysSince = (now - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
        const recency = Math.exp(-daysSince / HALF_LIFE_DAYS)
        return { ...r, score: r.score * (1 + RECENCY_FACTOR * recency) }
      })
      .sort((a, b) => b.score - a.score)
  }

  async delete(id: string): Promise<void> {
    if (this.graph) {
      await this.graph.deleteForPage(id)
    }
    await this.db.query('DELETE FROM brain_pages WHERE id = $1', [id])
  }

  // Clean expired cache entries. Returns count of removed entries.
  async cleanCache(ttlSeconds?: number): Promise<number> {
    if (!this.cache) return 0
    return this.cache.cleanExpired(ttlSeconds ?? this.cacheTtlSeconds)
  }

  // Wipe all cached queries (useful after bulk writes change the knowledge base).
  async clearCache(): Promise<void> {
    if (this.cache) await this.cache.clear()
  }

  async list(opts: { limit?: number; offset?: number } = {}): Promise<BrainPage[]> {
    const limit = opts.limit ?? 50
    const offset = opts.offset ?? 0
    const result = await this.db.query<DbRow>(
      'SELECT id, title, content, metadata, created_at, updated_at FROM brain_pages ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    )
    return result.rows.map(rowToPage)
  }

  async count(): Promise<number> {
    const result = await this.db.query<{ cnt: string }>('SELECT COUNT(*)::text AS cnt FROM brain_pages')
    return parseInt(result.rows[0].cnt, 10)
  }

  async updateMetadata(id: string, metadata: Record<string, unknown>): Promise<BrainPage | null> {
    await this.db.query(
      'UPDATE brain_pages SET metadata = $2::jsonb, updated_at = NOW() WHERE id = $1',
      [id, JSON.stringify(metadata)]
    )
    return this.get(id)
  }

  async similar(id: string, opts: SearchOptions = {}): Promise<SearchResult[]> {
    const embResult = await this.db.query<{ embedding: string }>(
      `SELECT embedding::text AS embedding FROM brain_pages WHERE id = $1`,
      [id]
    )
    if (embResult.rows.length === 0) return []

    const embedding = JSON.parse(embResult.rows[0].embedding) as number[]
    const limit = (opts.limit ?? 10) + 1  // +1 to exclude self

    const vectors = await vectorSearch(this.db, embedding, limit)
    const filtered = vectors.filter(v => v.id !== id).slice(0, opts.limit ?? 10)

    const pages = await Promise.all(filtered.map(v => this.get(v.id)))
    const results: SearchResult[] = filtered
      .map((v, i) => ({ v, page: pages[i] }))
      .filter(({ page }) => page !== null)
      .map(({ v, page }) => ({ page: page!, score: v.similarity, vectorRank: v.rank }))

    return this.budgetEnforcer.enforce(results, opts.tokenBudget ?? DEFAULT_TOKEN_BUDGET)
  }

  async stats(): Promise<{ pages: number; cacheEntries: number; entities: number; relationships: number }> {
    const pagesResult = await this.db.query<{ cnt: string }>('SELECT COUNT(*)::text AS cnt FROM brain_pages')
    const pages = parseInt(pagesResult.rows[0].cnt, 10)

    let cacheEntries = 0
    if (this.cache) {
      const r = await this.db.query<{ cnt: string }>('SELECT COUNT(*)::text AS cnt FROM query_cache')
      cacheEntries = parseInt(r.rows[0].cnt, 10)
    }

    let entities = 0
    let relationships = 0
    if (this.graph) {
      const er = await this.db.query<{ cnt: string }>('SELECT COUNT(*)::text AS cnt FROM kg_entities')
      entities = parseInt(er.rows[0].cnt, 10)
      const rr = await this.db.query<{ cnt: string }>('SELECT COUNT(*)::text AS cnt FROM kg_relationships')
      relationships = parseInt(rr.rows[0].cnt, 10)
    }

    return { pages, cacheEntries, entities, relationships }
  }

  async exportAll(): Promise<BrainPage[]> {
    const result = await this.db.query<DbRow>(
      'SELECT id, title, content, metadata, created_at, updated_at FROM brain_pages ORDER BY created_at ASC'
    )
    return result.rows.map(rowToPage)
  }

  async importBulk(inputs: BrainPageInput[]): Promise<{ imported: number; failed: number; errors: string[] }> {
    let imported = 0
    let failed = 0
    const errors: string[] = []

    for (const input of inputs) {
      try {
        await this.put(input)
        imported++
      } catch (e) {
        failed++
        errors.push(`${input.id ?? input.title}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    return { imported, failed, errors }
  }

  // Graph proxy methods — no-op when graphEnabled is false

  async getGraphEntities(pageId: string): Promise<Array<{ id: string; entityType: string; value: string; raw: string }>> {
    if (!this.graph) return []
    return this.graph.getEntitiesForPage(pageId)
  }

  async getGraphRelationships(pageId: string): Promise<Array<{ id: string; targetRef: string; relType: string }>> {
    if (!this.graph) return []
    return this.graph.getRelationshipsForPage(pageId)
  }

  async getGraphBacklinks(title: string): Promise<string[]> {
    if (!this.graph) return []
    return this.graph.findBacklinkSources(title)
  }

  async findPagesByEntity(entityType: string, value: string): Promise<string[]> {
    if (!this.graph) return []
    return this.graph.findPagesByEntityValue(entityType, value)
  }

  async getAllEntityValues(entityType: string): Promise<string[]> {
    if (!this.graph) return []
    return this.graph.getAllEntityValues(entityType)
  }

  async close(): Promise<void> {
    this.tokenCounter.free()
    await this.db.close()
  }
}
