import type { SearchResult } from '../types.js'
import { TokenCounter } from './counter.js'

export const DEFAULT_TOKEN_BUDGET = 2000

export class TokenBudgetEnforcer {
  constructor(private readonly counter: TokenCounter) {}

  // Greedy selection: take top-ranked results until token budget is exhausted.
  // Solves GBrain's missing Q3 control (unlimited retrieval → LLM context injection).
  enforce(results: SearchResult[], budget = DEFAULT_TOKEN_BUDGET): SearchResult[] {
    let total = 0
    const selected: SearchResult[] = []

    for (const result of results) {
      const text = `${result.page.title}\n${result.page.content}`
      const tokens = this.counter.count(text)
      if (total + tokens > budget) break
      selected.push(result)
      total += tokens
    }

    return selected
  }

  countResult(result: SearchResult): number {
    return this.counter.count(`${result.page.title}\n${result.page.content}`)
  }

  countTotal(results: SearchResult[]): number {
    return results.reduce((sum, r) => sum + this.countResult(r), 0)
  }
}
