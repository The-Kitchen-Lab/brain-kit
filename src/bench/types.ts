export interface BenchCorpusPage {
  id: string
  title: string
  content: string
}

export interface BenchQuery {
  id: string
  text: string
  relevantIds: string[]
}

export interface QueryEvalResult {
  queryId: string
  queryText: string
  retrievedIds: string[]
  relevantIds: string[]
  precisionAt: Record<number, number>
  recallAt: Record<number, number>
  latencyMs: number
}

export interface BenchmarkReport {
  engineLabel: string
  corpusSize: number
  queryCount: number
  meanPrecisionAt: Record<number, number>
  meanRecallAt: Record<number, number>
  p50LatencyMs: number
  p95LatencyMs: number
  results: QueryEvalResult[]
}
