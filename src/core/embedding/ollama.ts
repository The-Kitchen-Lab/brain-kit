import type { EmbeddingProvider } from './interface.js'

export interface OllamaEmbeddingOptions {
  host?: string   // default: http://localhost:11434
  model?: string  // default: nomic-embed-text
}

export class OllamaEmbedding implements EmbeddingProvider {
  readonly dimensions = 768
  readonly model: string
  private readonly host: string

  constructor(opts: OllamaEmbeddingOptions = {}) {
    this.host = opts.host ?? process.env.OLLAMA_HOST ?? 'http://localhost:11434'
    this.model = opts.model ?? 'nomic-embed-text'
  }

  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.host}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: text.slice(0, 32768) }),
    })
    if (!res.ok) throw new Error(`Ollama embedding failed: ${res.status} ${await res.text()}`)
    const data = await res.json() as { embedding: number[] }
    return data.embedding
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Ollama doesn't have a batch endpoint — run sequentially
    const results: number[][] = []
    for (const text of texts) {
      results.push(await this.embed(text))
    }
    return results
  }
}
