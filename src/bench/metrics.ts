import type { QueryEvalResult, BenchmarkReport } from './types.js'

/** Precision@K: fraction of top-K retrieved docs that are relevant. */
export function precisionAtK(retrieved: string[], relevant: Set<string>, k: number): number {
  const topK = retrieved.slice(0, k)
  const hits = topK.filter(id => relevant.has(id)).length
  return hits / k
}

/** Recall@K: fraction of all relevant docs found in top K. */
export function recallAtK(retrieved: string[], relevant: Set<string>, k: number): number {
  if (relevant.size === 0) return 1
  const topK = retrieved.slice(0, k)
  const hits = topK.filter(id => relevant.has(id)).length
  return hits / relevant.size
}

/** Compute mean metric across all query results. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

/** Compute percentile of sorted values. */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(Math.floor(p * sorted.length), sorted.length - 1)
  return sorted[idx]
}

const K_VALUES = [1, 3, 5, 10]

export function computeQueryResult(
  queryId: string,
  queryText: string,
  retrievedIds: string[],
  relevantIds: string[],
  latencyMs: number,
): QueryEvalResult {
  const relevant = new Set(relevantIds)
  const precisionAt: Record<number, number> = {}
  const recallAt: Record<number, number> = {}

  for (const k of K_VALUES) {
    precisionAt[k] = precisionAtK(retrievedIds, relevant, k)
    recallAt[k] = recallAtK(retrievedIds, relevant, k)
  }

  return { queryId, queryText, retrievedIds, relevantIds, precisionAt, recallAt, latencyMs }
}

export function aggregateReport(
  engineLabel: string,
  corpusSize: number,
  results: QueryEvalResult[],
): BenchmarkReport {
  const meanPrecisionAt: Record<number, number> = {}
  const meanRecallAt: Record<number, number> = {}

  for (const k of K_VALUES) {
    meanPrecisionAt[k] = mean(results.map(r => r.precisionAt[k]))
    meanRecallAt[k] = mean(results.map(r => r.recallAt[k]))
  }

  const latencies = results.map(r => r.latencyMs).sort((a, b) => a - b)

  return {
    engineLabel,
    corpusSize,
    queryCount: results.length,
    meanPrecisionAt,
    meanRecallAt,
    p50LatencyMs: percentile(latencies, 0.5),
    p95LatencyMs: percentile(latencies, 0.95),
    results,
  }
}
