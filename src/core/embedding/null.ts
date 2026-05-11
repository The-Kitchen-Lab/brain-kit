import type { EmbeddingProvider } from './interface.js'

/**
 * No-op embedding provider for BM25-only (keyword) search mode.
 *
 * When active:
 * - Pages are stored with NULL embeddings
 * - Vector search is skipped (keyword search only)
 * - Semantic cache is disabled
 *
 * Dimension is set to 1536 so the schema stays compatible if you later
 * supply an OPENAI_API_KEY and migrate to full semantic search.
 */
export class NullEmbedding implements EmbeddingProvider {
  readonly dimensions = 1536
  readonly model = 'none'

  async embed(_text: string): Promise<number[]> {
    return []
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map(() => [])
  }
}
