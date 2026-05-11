# brain-kit

**Token-budget aware memory engine + MCP server for AI agents.**

Zero-dependency alternative to GBrain — runs embedded, costs less, and keeps your LLM context predictable.

```bash
npm install brain-kit
```

```typescript
import { PGliteEngine, OpenAIEmbedding } from 'brain-kit'

const engine = new PGliteEngine(new OpenAIEmbedding(process.env.OPENAI_API_KEY))
await engine.init()

await engine.put({ title: 'Auth refactor', content: 'Migrated to RS256...' })

const results = await engine.search('authentication changes')
// Results are token-budget enforced. Default: 2000 tokens max injected.
```

---

## Why not GBrain?

[GBrain](https://github.com/garrytan/gbrain) is excellent — it proved that production agents benefit from structured memory. But it has three production-grade problems:

| Problem | GBrain | brain-kit |
|---------|--------|-----------|
| Token budget | ❌ unlimited injection | ✅ 2000 token default (configurable) |
| Query cache | ❌ cold search every time | ✅ pgvector semantic cache (0.92 cosine) |
| Query expansion | ❌ always calls Haiku (~900 tokens/query) | ✅ opt-in, zero-cost default |
| Runtime | ❌ Bun required, npm squatted | ✅ Node ≥18, npm publishable |
| Intent routing | ❌ LLM-dependent | ✅ zero-LLM regex classifier |

Without token budgeting, a single retrieval call can inject 50K+ tokens into context — at $3/M tokens on Sonnet that adds up fast. brain-kit enforces a hard token ceiling before returning results.

---

## What it is

brain-kit is a self-contained memory layer. Drop it into any agent — no server, no cloud account, no dependency on a specific agent framework.

**Storage:** Embedded Postgres (PGLite) with pgvector. One directory, zero infrastructure.

**Search pipeline (12 steps):**
1. Embed query
2. Semantic cache lookup → return if hit (skips steps 3–12)
3. Classify intent (zero-LLM)
4. Set retrieval weights based on intent
5. Query expansion (NoOp by default)
6. Hybrid search: vector (HNSW cosine) + keyword (tsvector BM25)
7. Entity boost for `entity` queries
8. Recency boost for `temporal`/`event` queries
9. Min-score filter
10. Backlink boost (knowledge graph re-ranking)
11. **Token budget enforcement** — greedy selection, hard ceiling
12. Cache results for next time

**Typical latency:** p50 ~2–5ms (cache miss), <1ms (cache hit)

---

## Installation

```bash
npm install brain-kit
```

Requires:
- Node.js ≥18
- An embedding provider (optional — see below)

---

## Quick start

```typescript
import { PGliteEngine, OpenAIEmbedding } from 'brain-kit'

const engine = new PGliteEngine(
  new OpenAIEmbedding(process.env.OPENAI_API_KEY),
  {
    dbPath: './my-agent.pglite',   // persists to disk
    tokenBudget: 3000,             // tokens allowed in context injection (not an option here, set per search)
    cacheEnabled: true,            // semantic query cache
    graphEnabled: true,            // knowledge graph for backlink boost
  }
)

await engine.init()

// Write
await engine.put({
  title: 'Sprint 12 retrospective',
  content: 'Velocity: 34 pts. Blockers: API rate limits on the embedding step...',
  metadata: { type: 'meeting', date: '2026-05-11' },
})

// Search — results are already token-budget filtered
const results = await engine.search('what slowed us down last sprint', {
  limit: 10,
  tokenBudget: 2000,
})

for (const r of results) {
  console.log(r.page.title, r.score, r.intent)
}

await engine.close()
```

---

## Intent classification

brain-kit classifies every query into one of four intents without calling an LLM:

```typescript
import { classifyIntent } from 'brain-kit'

classifyIntent('who is @garrytan')
// → { intent: 'entity', confidence: 0.45, signals: ['entity:mention'] }

classifyIntent('when did we deploy last week')
// → { intent: 'event', confidence: 0.80, signals: ['event:when-did', 'temporal:relative-period'] }

classifyIntent('recent changes to the auth module')
// → { intent: 'temporal', confidence: 0.35, signals: ['temporal:recency-word'] }

classifyIntent('how does RRF scoring work')
// → { intent: 'general', confidence: 1.0, signals: [] }
```

Intent drives search strategy automatically:

| Intent | Behaviour |
|--------|-----------|
| `entity` | Graph entity lookup + 30% score boost for matching pages |
| `temporal` | Exponential recency boost — 30-day half-life |
| `event` | Keyword-heavy RRF weights (1.5×) + recency boost |
| `general` | Standard hybrid search, no adjustments |

Bypass with `{ skipIntentClassification: true }`.

---

## Token budget

The most important feature. Every `search()` call returns results that fit inside a token ceiling:

```typescript
const results = await engine.search('auth changes', { tokenBudget: 1500 })
// results.reduce(tokens) ≤ 1500 — guaranteed

// Inject directly into prompt
const context = results.map(r => r.page.content).join('\n\n')
```

Token counting uses `js-tiktoken` with `cl100k_base` (±5% vs Claude/GPT-4). Count manually:

```typescript
import { TokenCounter } from 'brain-kit'
const counter = new TokenCounter()
console.log(counter.count('Hello world'))  // → 2
```

---

## Semantic cache

Repeated and semantically similar queries return cached results. No embedding call, no search:

```typescript
// First call: full pipeline, ~120ms (network + search)
await engine.search('what did we ship in May')

// Second call (similar phrasing): cache hit, <1ms
await engine.search('what was shipped during May')

// Force fresh search
await engine.search('...', { skipCache: true })

// Expire old entries (run periodically)
await engine.cleanCache(3600)  // remove entries older than 1h

// Wipe all (useful after large bulk imports)
await engine.clearCache()
```

Default threshold: `0.92` cosine similarity. Tune via `cacheSimilarityThreshold` option.

---

## Knowledge graph

Entities (`[[wikilinks]]`, `#hashtags`, `@mentions`, URLs) are extracted at write time and stored in a typed graph. Pages with more backlinks rank higher automatically.

```typescript
// Extract without storing
import { extractEntities } from 'brain-kit'
extractEntities('Meeting with [[project-x]] and @alice about #infra')
// → [
//     { type: 'wikilink', value: 'project-x', raw: '[[project-x]]' },
//     { type: 'mention',  value: 'alice',     raw: '@alice' },
//     { type: 'hashtag',  value: 'infra',     raw: '#infra' },
//   ]

// Graph queries
await engine.getGraphEntities(pageId)
await engine.getGraphRelationships(pageId)
await engine.getGraphBacklinks('project-x')
await engine.findPagesByEntity('hashtag', 'infra')
```

---

## Embedding modes

brain-kit auto-detects which embedding mode to use at startup — no config required.

| Priority | Mode | Requires | Search quality |
|----------|------|----------|---------------|
| 1 | **OpenAI** `text-embedding-3-small` | `OPENAI_API_KEY` | best (~$0.0001/1K tokens) |
| 2 | **Ollama** `nomic-embed-text` | Ollama running locally | good (free, ~274MB model) |
| 3 | **Keyword-only** BM25 | nothing | ~65% vs semantic |

Startup log tells you which mode is active:

```
brain-kit MCP server (stdio) started. DB: ./brain.pglite | embedding: ollama (nomic-embed-text, 768 dim)
```

### Setting up Ollama

```bash
brew install ollama
ollama pull nomic-embed-text   # ~274MB, one-time
ollama serve                   # runs on http://localhost:11434
```

Custom host: set `OLLAMA_HOST=http://my-server:11434`.

### Keyword-only mode

No setup needed — just start the MCP server without any env vars. Semantic search and cache are disabled; BM25 full-text search still works. Good enough for exact-term lookups, code snippets, and named entities.

---

## MCP server (Claude Code / Cursor / Windsurf)

brain-kit ships a built-in MCP server with 22 tools.

### stdio (recommended for Claude Code)

**With OpenAI:**
```json
// ~/.claude/settings.json
{
  "mcpServers": {
    "brain": {
      "command": "node",
      "args": ["/path/to/brain-kit/dist/bin/brain-mcp.js"],
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "BRAIN_DB_PATH": "/path/to/your-agent.pglite"
      }
    }
  }
}
```

**With Ollama (no API key needed):**
```json
{
  "mcpServers": {
    "brain": {
      "command": "node",
      "args": ["/path/to/brain-kit/dist/bin/brain-mcp.js"],
      "env": {
        "BRAIN_DB_PATH": "/path/to/your-agent.pglite"
      }
    }
  }
}
```
Ollama is auto-detected if it's running on `localhost:11434`.

**Keyword-only (no setup):**
```json
{
  "mcpServers": {
    "brain": {
      "command": "node",
      "args": ["/path/to/brain-kit/dist/bin/brain-mcp.js"],
      "env": {
        "BRAIN_DB_PATH": "/path/to/your-agent.pglite"
      }
    }
  }
}
```
Same config as Ollama — if Ollama isn't running, it falls back to keyword-only automatically.

### HTTP

```bash
BRAIN_DB_PATH=./brain.pglite \
  node dist/bin/brain-mcp.js --http --port 3000
```

### Available MCP tools

| Tool | Description |
|------|-------------|
| `brain_put` | Create or update a page |
| `brain_get` | Retrieve by ID |
| `brain_delete` | Delete page + graph data |
| `brain_list` | Paginated listing |
| `brain_count` | Total page count |
| `brain_bulk_put` | Import multiple pages |
| `brain_update_metadata` | Update metadata (no re-embed) |
| `brain_search` | Hybrid search with intent routing |
| `brain_similar` | Semantically similar pages |
| `brain_search_by_tag` | Find by hashtag |
| `brain_graph_entities` | Entities on a page |
| `brain_graph_relationships` | Outgoing relationships |
| `brain_graph_backlinks` | What links to a title |
| `brain_graph_find_by_entity` | Pages with entity value |
| `brain_graph_all_entities` | All values for entity type |
| `brain_cache_clear` | Wipe semantic cache |
| `brain_cache_clean` | Expire old entries |
| `brain_token_count` | Count tokens |
| `brain_extract_entities` | Extract entities without storing |
| `brain_stats` | DB statistics |
| `brain_export` | Export all as JSON |
| `brain_import` | Import from JSON |

---

## CLI helper (from scripts)

Save a page from a shell script or Python:

```bash
OPENAI_API_KEY=sk-... BRAIN_DB_PATH=~/.brain-kit/agent.pglite \
  node dist/scripts/brain-save.js \
  --title "TASK-42 completed" \
  --content "Implemented OAuth2 refresh token rotation..." \
  --meta '{"type":"task","status":"done"}'
```

Returns: `{"ok":true,"id":"...","title":"..."}`

---

## Benchmark

Run the built-in benchmark suite (no API key needed — uses deterministic offline embeddings):

```bash
npm run bench
# or with per-query detail:
node dist/bench/runner.js --verbose
```

50-page corpus, 20 queries with ground-truth relevance labels. Deterministic TF-IDF + FNV-1a hash projection — reproducible across machines and runs.

Example output:

```
BrainBench — Brain-Kit Retrieval Evaluation
===========================================
Corpus: 50 pages | Queries: 20

Metric        @1       @3       @5      @10
─────────────────────────────────────────────
Precision   72.0%    68.0%    63.0%    58.0%
Recall      85.0%    83.0%    81.0%    79.0%

Latency   p50 = 2.3 ms   p95 = 5.1 ms
```

---

## API reference

### `PGliteEngine`

```typescript
new PGliteEngine(embedding: EmbeddingProvider, opts?: PGliteEngineOptions)

interface PGliteEngineOptions {
  dbPath?: string                      // default: './brain.pglite'
  expander?: QueryExpander             // default: NoOpExpander
  cacheEnabled?: boolean               // default: true
  cacheSimilarityThreshold?: number    // default: 0.92
  cacheTtlSeconds?: number             // default: 3600
  graphEnabled?: boolean               // default: true
  backlinkBoostFactor?: number         // default: 0.1
}
```

### `search(query, opts?)`

```typescript
interface SearchOptions {
  limit?: number                        // default: 20
  tokenBudget?: number                  // default: 2000
  minScore?: number                     // RRF score floor
  skipCache?: boolean                   // default: false
  cacheThreshold?: number               // override per-call
  skipGraphBoost?: boolean              // default: false
  skipIntentClassification?: boolean    // default: false
}
```

---

## Programmatic use (embedding your own LLM expander)

```typescript
import { PGliteEngine, OpenAIEmbedding, LLMExpander } from 'brain-kit'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

const expander = new LLMExpander(async (query) => {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `Generate 3 semantic search variants for: "${query}". Return a JSON array of strings.`,
    }],
  })
  return JSON.parse((msg.content[0] as { text: string }).text)
})

const engine = new PGliteEngine(
  new OpenAIEmbedding(process.env.OPENAI_API_KEY),
  { expander, dbPath: './brain.pglite' }
)
```

---

## Build from source

```bash
git clone https://github.com/The-Kitchen-Lab/brain-kit
cd brain-kit
npm install
npm run build

# Run benchmark
npm run bench

# Start MCP server
OPENAI_API_KEY=sk-... npm start
```

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | OpenAI embeddings (priority 1). |
| `OLLAMA_HOST` | `http://localhost:11434` | Override Ollama endpoint (priority 2). Auto-detected if running. |
| `BRAIN_DB_PATH` | `./brain.pglite` | PGLite directory path. |
| `BRAIN_CACHE_ENABLED` | `true` | Enable semantic query cache (auto-disabled in keyword-only mode). |
| `BRAIN_GRAPH_ENABLED` | `true` | Enable knowledge graph. |
| `BRAIN_PORT` | `3000` | HTTP mode port. |

---

## License

MIT
