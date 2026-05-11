import OpenAI from 'openai'
import type { EmbeddingProvider } from './interface.js'

export class OpenAIEmbedding implements EmbeddingProvider {
  private readonly client: OpenAI
  readonly dimensions = 1536
  readonly model = 'text-embedding-3-small'

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY })
  }

  async embed(text: string): Promise<number[]> {
    const res = await this.client.embeddings.create({
      model: this.model,
      input: text.slice(0, 8191 * 4), // ~8K token safety truncation
    })
    return res.data[0].embedding
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const res = await this.client.embeddings.create({
      model: this.model,
      input: texts.map(t => t.slice(0, 8191 * 4)),
    })
    return res.data.map(d => d.embedding)
  }
}
