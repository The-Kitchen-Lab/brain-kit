import type { QueryExpander } from './interface.js'

// Zero token cost — returns only the original query.
// Default for BrainEngine. GBrain always calls expand (Q1 in M1 analysis, ~300 token/query);
// this inverts that default so expansion is explicitly opt-in.
export class NoOpExpander implements QueryExpander {
  async expand(query: string): Promise<string[]> {
    return [query]
  }
}
