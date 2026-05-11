import { randomUUID } from 'crypto'
import type { PGlite } from '@electric-sql/pglite'
import type { SemanticCache, CacheEntry } from './interface.js'
import type { SearchResult } from '../types.js'

// Default: cache hits when cosine similarity >= 0.92.
// Empirically, queries with sim >= 0.92 produce near-identical retrieval results.
export const DEFAULT_CACHE_THRESHOLD = 0.92
export const DEFAULT_CACHE_TTL_SECONDS = 3600

export class PGliteSemanticCache implements SemanticCache {
  constructor(
    private readonly db: PGlite,
    private readonly dimensions: number,
  ) {}

  async init(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS query_cache (
        id          TEXT PRIMARY KEY,
        query_text  TEXT NOT NULL,
        embedding   vector(${this.dimensions}),
        results     JSONB NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS query_cache_hnsw_idx
        ON query_cache USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    `)
  }

  async lookup(
    queryEmbedding: number[],
    threshold = DEFAULT_CACHE_THRESHOLD,
  ): Promise<CacheEntry | null> {
    // pgvector <=> is cosine distance = 1 - cosine_similarity (for unit vectors).
    // threshold 0.92 → maxDistance 0.08
    const maxDistance = 1.0 - threshold
    const vec = `[${queryEmbedding.join(',')}]`

    const result = await this.db.query<{
      query_text: string
      results: unknown
      created_at: string
    }>(
      `SELECT query_text, results, created_at
       FROM query_cache
       WHERE embedding <=> $1::vector < $2
       ORDER BY embedding <=> $1::vector
       LIMIT 1`,
      [vec, maxDistance]
    )

    if (result.rows.length === 0) return null

    const row = result.rows[0]
    const parsed: SearchResult[] = typeof row.results === 'string'
      ? (JSON.parse(row.results) as SearchResult[])
      : (row.results as SearchResult[])

    // JSON serialization drops Date objects — restore them
    const results = parsed.map(r => ({
      ...r,
      page: {
        ...r.page,
        createdAt: new Date(r.page.createdAt),
        updatedAt: new Date(r.page.updatedAt),
      },
    }))

    return {
      queryText: row.query_text,
      results,
      createdAt: new Date(row.created_at),
    }
  }

  async store(
    queryText: string,
    queryEmbedding: number[],
    results: SearchResult[],
  ): Promise<void> {
    const vec = `[${queryEmbedding.join(',')}]`
    await this.db.query(
      `INSERT INTO query_cache (id, query_text, embedding, results)
       VALUES ($1, $2, $3::vector, $4::jsonb)`,
      [randomUUID(), queryText, vec, JSON.stringify(results)]
    )
  }

  async cleanExpired(ttlSeconds = DEFAULT_CACHE_TTL_SECONDS): Promise<number> {
    const result = await this.db.query<{ id: string }>(
      `DELETE FROM query_cache
       WHERE created_at < NOW() - ($1::text || ' seconds')::INTERVAL
       RETURNING id`,
      [ttlSeconds.toString()]
    )
    return result.rows.length
  }

  async clear(): Promise<void> {
    await this.db.exec('DELETE FROM query_cache')
  }
}
