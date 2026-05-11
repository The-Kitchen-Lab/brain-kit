import type { QueryExpander } from './interface.js'

// Caller-supplied function that takes the original query and returns expansion variants.
// Decoupled from any specific LLM SDK — bring your own client.
//
// Example with Anthropic SDK (Haiku, ~300 tokens/call):
//   const expander = new LLMExpander(async (q) => {
//     const msg = await anthropic.messages.create({
//       model: 'claude-haiku-4-5-20251001',
//       max_tokens: 150,
//       messages: [{ role: 'user', content: `Generate 3 semantic search variants for: "${q}". Return JSON array of strings.` }],
//     })
//     return JSON.parse((msg.content[0] as { text: string }).text)
//   })
export type ExpandFn = (query: string) => Promise<string[]>

export class LLMExpander implements QueryExpander {
  constructor(
    private readonly expandFn: ExpandFn,
    private readonly maxVariants = 4,
  ) {}

  async expand(query: string): Promise<string[]> {
    let variants: string[]
    try {
      variants = await this.expandFn(query)
    } catch {
      // Expansion failure is non-fatal — fall back to original query only
      return [query]
    }

    // Always lead with original, deduplicate, cap at maxVariants
    const seen = new Set<string>([query])
    const result = [query]
    for (const v of variants) {
      if (!seen.has(v) && result.length < this.maxVariants) {
        seen.add(v)
        result.push(v)
      }
    }
    return result
  }
}
