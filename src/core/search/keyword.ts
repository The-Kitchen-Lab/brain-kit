import type { PGlite } from '@electric-sql/pglite'

export interface KeywordResult {
  id: string
  title: string
  content: string
  metadata: Record<string, unknown>
  tsRank: number
  rank: number
}

// tsvector GIN search with websearch_to_tsquery for natural language queries.
// Functional GIN index on to_tsvector('english', title || ' ' || content).
export async function keywordSearch(
  db: PGlite,
  query: string,
  limit: number
): Promise<KeywordResult[]> {
  try {
    const result = await db.query<{
      id: string
      title: string
      content: string
      metadata: Record<string, unknown>
      ts_rank: number
    }>(
      `SELECT id, title, content, metadata,
              ts_rank(
                to_tsvector('english', title || ' ' || content),
                websearch_to_tsquery('english', $1)
              ) AS ts_rank
       FROM brain_pages
       WHERE to_tsvector('english', title || ' ' || content)
             @@ websearch_to_tsquery('english', $1)
       ORDER BY ts_rank DESC
       LIMIT $2`,
      [query, limit]
    )

    return result.rows.map((row, i) => ({
      ...row,
      tsRank: row.ts_rank,
      rank: i + 1,
    }))
  } catch {
    // websearch_to_tsquery can throw on malformed queries (bare operators, etc.)
    return []
  }
}
