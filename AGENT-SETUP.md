# brain-kit — Agent Setup Guide

This document is written to be given directly to an AI agent.
Follow these instructions to add a persistent, searchable memory layer to your environment.

---

## What you're installing

brain-kit gives you a local memory engine backed by embedded Postgres (PGLite).
No external database, no cloud account. Everything lives in a single directory on disk.

You get:
- `brain_put` — save anything (notes, task results, code summaries, decisions)
- `brain_search` — hybrid semantic + keyword search, token-budget enforced
- `brain_similar` — find related pages by embedding proximity
- Knowledge graph: wikilinks, hashtags, @mentions are indexed automatically
- 22 MCP tools callable from Claude Code, Cursor, Windsurf, or any MCP-compatible host

---

## Prerequisites

- Node.js ≥18 (`node --version`)
- An OpenAI API key (for embeddings — `text-embedding-3-small`)

---

## Step 1 — Clone and build

```bash
git clone https://github.com/The-Kitchen-Lab/brain-kit ~/brain-kit
cd ~/brain-kit
npm install
npm run build
```

Verify the build:

```bash
ls dist/bin/brain-mcp.js   # should exist
```

---

## Step 2 — Choose a database path

brain-kit stores everything in a PGLite directory. Pick a path that persists across sessions:

```bash
mkdir -p ~/.brain-kit
# Your DB will live at ~/.brain-kit/agent.pglite
```

Use separate paths for separate agents or projects. They won't interfere.

---

## Step 3 — Add to Claude Code (stdio MCP)

Edit `~/.claude/settings.json` and add a `mcpServers` entry:

```json
{
  "mcpServers": {
    "brain": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/brain-kit/dist/bin/brain-mcp.js"],
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "BRAIN_DB_PATH": "/Users/YOUR_USERNAME/.brain-kit/agent.pglite"
      }
    }
  }
}
```

Restart Claude Code. You should see `brain` in the MCP server list.

---

## Step 3 (alternative) — HTTP mode

If you prefer HTTP or need to share the brain across multiple processes:

```bash
OPENAI_API_KEY=sk-... \
BRAIN_DB_PATH=~/.brain-kit/agent.pglite \
  node ~/brain-kit/dist/bin/brain-mcp.js --http --port 3001
```

Keep this process running. It handles multiple sessions via `mcp-session-id` headers.

---

## Step 4 — Verify

Once connected, call `brain_stats` to confirm everything is working:

```
Tool: brain_stats
Input: {}
Expected output: { pages: 0, cacheEntries: 0, entities: 0, relationships: 0 }
```

---

## Core usage patterns

### Save a task result

```
Tool: brain_put
Input: {
  "title": "TASK-42: Auth refactor completed",
  "content": "Migrated session tokens to RS256 JWT. Rotation interval: 15min. Removed legacy MD5 hashing from user_sessions table.",
  "metadata": { "type": "task", "status": "done", "date": "2026-05-11" }
}
```

### Save a project decision

```
Tool: brain_put
Input: {
  "title": "Decision: PostgreSQL over MongoDB for user data",
  "content": "Chose Postgres because: strong ACID guarantees, existing pgvector dependency, team familiarity. MongoDB considered but rejected due to schema migration complexity at scale.",
  "metadata": { "type": "decision", "project": "auth-kit" }
}
```

### Search

```
Tool: brain_search
Input: {
  "query": "authentication decisions",
  "limit": 5,
  "tokenBudget": 2000
}
```

Results are pre-filtered to fit within `tokenBudget` tokens. Inject directly into context.

### Find related pages

```
Tool: brain_similar
Input: { "id": "<page-id-from-put>", "limit": 5 }
```

---

## What to save

Save anything that you'd want to recall in a future session:

| Content type | Example title |
|---|---|
| Task completions | `TASK-12 / M3: database migration done` |
| Architecture decisions | `Decision: use Redis for rate limiting` |
| Bug root causes | `Bug: null pointer in auth middleware — fixed 2026-05` |
| Project summaries | `Project: brain-kit — token-aware memory engine` |
| Meeting notes | `Meeting 2026-05-11: sprint planning, 34pt velocity` |
| Reference facts | `OpenAI API: embeddings endpoint, text-embedding-3-small, 1536 dim` |

Use `[[wikilinks]]` in content to create graph relationships between pages.
Use `#hashtags` to tag pages for entity-based search (`brain_search_by_tag`).

---

## Token budget — why it matters

Every `brain_search` result set is token-budget enforced before being returned.
The default is **2000 tokens**.

This means you can safely do:
```
const memories = brain_search(query, tokenBudget=2000)
inject(memories)  // guaranteed ≤ 2000 tokens in context
```

Without this, a 500-page brain could inject 50K+ tokens per query — expensive and often harmful to reasoning quality (too much noise).

Increase the budget when you need more context:
```
Input: { "query": "...", "tokenBudget": 4000 }
```

---

## Intent routing (automatic)

brain-kit detects query intent without calling an LLM:

- `entity` queries (`@mentions`, `[[wikilinks]]`, `#tags`, proper names) → graph entity boost
- `temporal` queries (`recent`, `last week`, `in May`) → recency boost
- `event` queries (`when did`, `deployed`, `completed`) → keyword-heavy + recency boost
- `general` → standard hybrid search

You don't need to do anything. Just search naturally.

---

## Bulk import (migrate existing notes)

```
Tool: brain_import
Input: {
  "pages": [
    { "title": "...", "content": "..." },
    { "title": "...", "content": "..." }
  ]
}
```

Then run `brain_cache_clear` to ensure the cache reflects the new data.

---

## Export and backup

```
Tool: brain_export
Input: {}
```

Returns all pages as a JSON array. Save this to a file for backup or migration.

---

## Maintenance

Run periodically to keep the cache healthy:

```
Tool: brain_cache_clean
Input: { "ttlSeconds": 86400 }   // expire entries older than 24h
```

Check stats to monitor growth:

```
Tool: brain_stats
Input: {}
```

---

## Troubleshooting

**"OPENAI_API_KEY environment variable is required"**
→ The MCP server needs the key in its env. Check `settings.json`.

**`brain_search` returns 0 results**
→ Run `brain_stats` — if `pages: 0`, nothing has been saved yet. Run `brain_put` first.

**Slow first search after restart**
→ PGLite loads the DB on first query. Subsequent queries will be faster.

**Cache returning stale results after bulk import**
→ Call `brain_cache_clear` after large batch writes.

---

## All 22 MCP tools

| Tool | What it does |
|------|---|
| `brain_put` | Save or update a page |
| `brain_get` | Retrieve by ID |
| `brain_delete` | Delete page + graph data |
| `brain_list` | Paginated list of all pages |
| `brain_count` | Total page count |
| `brain_bulk_put` | Save multiple pages at once |
| `brain_update_metadata` | Update metadata without re-embedding |
| `brain_search` | Hybrid semantic + keyword search |
| `brain_similar` | Find semantically similar pages |
| `brain_search_by_tag` | Find pages with a specific hashtag |
| `brain_graph_entities` | List entities extracted from a page |
| `brain_graph_relationships` | Outgoing relationships from a page |
| `brain_graph_backlinks` | Pages that link to a given title |
| `brain_graph_find_by_entity` | Pages containing a specific entity |
| `brain_graph_all_entities` | All distinct values for an entity type |
| `brain_cache_clear` | Wipe semantic cache |
| `brain_cache_clean` | Expire old cache entries |
| `brain_token_count` | Count tokens in text |
| `brain_extract_entities` | Extract entities without storing |
| `brain_stats` | Pages / cache / graph statistics |
| `brain_export` | Export all pages as JSON |
| `brain_import` | Import pages from JSON |
