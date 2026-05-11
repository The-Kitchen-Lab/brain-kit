import type { PGlite } from '@electric-sql/pglite'

export interface VectorResult {
  id: string
  title: string
  content: string
  metadata: Record<string, unknown>
  similarity: number
  rank: number
}

// HNSW cosine search via pgvector <=> operator.
// HNSW index (m=16, ef_construction=64) gives sub-ms ANN at scale.
export async function vectorSearch(
  db: PGlite,
  embedding: number[],
  limit: number
): Promise<VectorResult[]> {
  const vec = `[${embedding.join(',')}]`

  const result = await db.query<{
    id: string
    title: string
    content: string
    metadata: Record<string, unknown>
    similarity: number
  }>(
    `SELECT id, title, content, metadata,
            1 - (embedding <=> $1::vector) AS similarity
     FROM brain_pages
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vec, limit]
  )

  return result.rows.map((row, i) => ({ ...row, rank: i + 1 }))
}
