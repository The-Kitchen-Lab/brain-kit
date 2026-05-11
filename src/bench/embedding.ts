import type { EmbeddingProvider } from '../core/embedding/interface.js'

// Stopwords to exclude from TF-IDF computation
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
  'it', 'its', 'this', 'that', 'these', 'those', 'as', 'has', 'have', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'can', 'not', 'no', 'so', 'if', 'about', 'also', 'their', 'they', 'which',
  'who', 'what', 'when', 'where', 'how', 'all', 'more', 'into', 'than',
  'up', 'use', 'used', 'using', 'such', 'both', 'new', 'other', 'one',
  'he', 'she', 'we', 'his', 'her', 'our', 'your', 'my', 'its',
])

const DIMS = 128

// FNV-1a 32-bit hash — deterministic, uniform distribution
function fnv1a32(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length >= 2 && !STOPWORDS.has(t))
}

/**
 * Offline deterministic embedding using TF + hash projection.
 * No external API required — captures lexical similarity reliably.
 * Uses 128 dimensions to keep the PGlite vector column small.
 */
export class DeterministicEmbedding implements EmbeddingProvider {
  readonly dimensions = DIMS
  readonly model = 'deterministic-tfidf-128'

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.embed(t)))
  }

  async embed(text: string): Promise<number[]> {
    const tokens = tokenize(text)
    if (tokens.length === 0) return new Array(DIMS).fill(0)

    const tf = new Map<string, number>()
    for (const t of tokens) {
      tf.set(t, (tf.get(t) ?? 0) + 1)
    }

    const vec = new Float64Array(DIMS)

    for (const [word, freq] of tf) {
      // Primary dimension
      const d1 = fnv1a32(word) % DIMS
      vec[d1] += freq / tokens.length

      // Secondary dimension using reversed word string — reduces collision loss
      const rev = word.split('').reverse().join('')
      const d2 = fnv1a32(rev) % DIMS
      vec[d2] += (freq / tokens.length) * 0.5
    }

    // L2 normalize
    let norm = 0
    for (let i = 0; i < DIMS; i++) norm += vec[i] * vec[i]
    norm = Math.sqrt(norm)
    if (norm > 0) {
      for (let i = 0; i < DIMS; i++) vec[i] /= norm
    }

    return Array.from(vec)
  }
}
