#!/usr/bin/env node
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFile } from 'fs/promises'
import { PGliteEngine } from '../core/storage/pglite.js'
import { DeterministicEmbedding } from './embedding.js'
import { CORPUS } from './corpus.js'
import { QUERIES } from './queries.js'
import { computeQueryResult, aggregateReport } from './metrics.js'
import type { QueryEvalResult } from './types.js'

async function main(): Promise<void> {
  const dbPath = join(tmpdir(), `brain-bench-${Date.now()}`)
  const verbose = process.argv.includes('--verbose')
  const writeJson = !process.argv.includes('--no-json')

  console.log('BrainBench — Brain-Kit Retrieval Evaluation')
  console.log('===========================================')
  console.log(`Corpus: ${CORPUS.length} pages | Queries: ${QUERIES.length}`)
  console.log('')

  // Offline deterministic embeddings — no API key required, reproducible across runs
  const embedding = new DeterministicEmbedding()

  const engine = new PGliteEngine(embedding, {
    dbPath,
    cacheEnabled: false,  // disable cache so each query hits the search pipeline
    graphEnabled: true,   // keep backlink boost active for realistic evaluation
  })

  await engine.init()

  // Ingest all corpus pages
  process.stdout.write('Ingesting ')
  for (const page of CORPUS) {
    await engine.put({ id: page.id, title: page.title, content: page.content })
    process.stdout.write('.')
  }
  console.log(` ${CORPUS.length} pages done`)
  console.log('')

  // Run each query and record retrieval results + latency
  const evalResults: QueryEvalResult[] = []

  for (const query of QUERIES) {
    const t0 = performance.now()
    const searchResults = await engine.search(query.text, {
      limit: 10,
      tokenBudget: 1_000_000,  // effectively unlimited — measure raw retrieval quality
      skipCache: true,
    })
    const latencyMs = Math.round((performance.now() - t0) * 10) / 10

    const retrievedIds = searchResults.map(r => r.page.id)
    evalResults.push(
      computeQueryResult(query.id, query.text, retrievedIds, query.relevantIds, latencyMs)
    )
  }

  const report = aggregateReport(
    'Brain-Kit / DeterministicEmbedding + Hybrid-RRF + BacklinkBoost',
    CORPUS.length,
    evalResults,
  )

  // Print summary table
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`.padStart(7)

  console.log(`Engine : ${report.engineLabel}`)
  console.log(`Corpus : ${report.corpusSize} pages | Queries: ${report.queryCount}`)
  console.log('')
  console.log('Metric        @1       @3       @5      @10')
  console.log('─────────────────────────────────────────────')
  console.log(`Precision ${pct(report.meanPrecisionAt[1])} ${pct(report.meanPrecisionAt[3])} ${pct(report.meanPrecisionAt[5])} ${pct(report.meanPrecisionAt[10])}`)
  console.log(`Recall    ${pct(report.meanRecallAt[1])} ${pct(report.meanRecallAt[3])} ${pct(report.meanRecallAt[5])} ${pct(report.meanRecallAt[10])}`)
  console.log('')
  console.log(`Latency   p50 = ${report.p50LatencyMs.toFixed(1)} ms   p95 = ${report.p95LatencyMs.toFixed(1)} ms`)
  console.log('')

  if (verbose) {
    console.log('Per-query detail:')
    for (const r of report.results) {
      const p5 = `${(r.precisionAt[5] * 100).toFixed(0)}%`.padStart(4)
      const r5 = `${(r.recallAt[5] * 100).toFixed(0)}%`.padStart(4)
      const lat = r.latencyMs.toFixed(0).padStart(5)
      console.log(`  ${r.queryId}  P@5=${p5}  R@5=${r5}  lat=${lat}ms  "${r.queryText}"`)
    }
    console.log('')
  }

  await engine.close()

  if (writeJson) {
    const reportPath = join(process.cwd(), 'bench-report.json')
    await writeFile(reportPath, JSON.stringify(report, null, 2))
    console.log(`JSON report → ${reportPath}`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
