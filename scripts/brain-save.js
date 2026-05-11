#!/usr/bin/env node
/**
 * brain-save.js — CLI helper: save/update a page in the brain-kit PGLite engine.
 *
 * Usage:
 *   node brain-save.js --title "Task-42 tamamlandı" --content "..." [--id "uuid"] [--meta '{"type":"task"}']
 *
 * Env:
 *   OPENAI_API_KEY  — required for embeddings
 *   BRAIN_DB_PATH   — path to .pglite dir (default: ~/.brain-kit/xeonen.pglite)
 */

import { PGliteEngine } from '../dist/index.js'
import { OpenAIEmbedding } from '../dist/index.js'
import { parseArgs } from 'node:util'
import { homedir } from 'node:os'
import path from 'node:path'

const { values } = parseArgs({
  options: {
    title:   { type: 'string' },
    content: { type: 'string' },
    id:      { type: 'string' },
    meta:    { type: 'string', default: '{}' },
  },
  strict: false,
  allowPositionals: true,
})

if (!values.title || !values.content) {
  process.stderr.write('Usage: node brain-save.js --title "..." --content "..."\n')
  process.exit(1)
}

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  process.stderr.write('Error: OPENAI_API_KEY environment variable required\n')
  process.exit(1)
}

const dbPath = process.env.BRAIN_DB_PATH ?? path.join(homedir(), '.brain-kit', 'xeonen.pglite')

const embedding = new OpenAIEmbedding(apiKey)
const engine = new PGliteEngine(embedding, {
  dbPath,
  cacheEnabled: false,
  graphEnabled: true,
})

await engine.init()

let metadata = {}
try { metadata = JSON.parse(values.meta ?? '{}') } catch {}

const page = await engine.put({
  ...(values.id ? { id: values.id } : {}),
  title: values.title,
  content: values.content,
  metadata: {
    savedAt: new Date().toISOString(),
    source: 'xeonen-gateway',
    ...metadata,
  },
})

await engine.close()
process.stdout.write(JSON.stringify({ ok: true, id: page.id, title: page.title }) + '\n')
