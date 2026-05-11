import type { SearchResult } from '../types.js'

export const DEFAULT_BACKLINK_BOOST_FACTOR = 0.1

export class BacklinkBooster {
  // Re-rank results by log-scaled backlink count.
  // multiplier = 1 + factor * ln(1 + count)
  // factor=0.1: 0 links → ×1.0, 1 link → ×1.069, 5 → ×1.179, 10 → ×1.240, 100 → ×1.461
  boost(
    results: SearchResult[],
    backlinkCounts: Map<string, number>,
    factor = DEFAULT_BACKLINK_BOOST_FACTOR,
  ): SearchResult[] {
    return results
      .map(r => {
        const count = backlinkCounts.get(r.page.id) ?? 0
        if (count === 0) return r
        return { ...r, score: r.score * (1 + factor * Math.log1p(count)) }
      })
      .sort((a, b) => b.score - a.score)
  }
}
