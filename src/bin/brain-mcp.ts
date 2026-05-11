#!/usr/bin/env node
import { createServer } from 'http'
import { randomUUID } from 'crypto'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { IncomingMessage, ServerResponse } from 'http'
import { PGliteEngine } from '../core/storage/pglite.js'
import { OpenAIEmbedding } from '../core/embedding/openai.js'
import { OllamaEmbedding } from '../core/embedding/ollama.js'
import { NullEmbedding } from '../core/embedding/null.js'
import type { EmbeddingProvider } from '../core/embedding/interface.js'
import { createBrainMCPServer } from '../mcp/server.js'

const args = process.argv.slice(2)
const isHttp = args.includes('--http')
const portIdx = args.indexOf('--port')
const port = portIdx !== -1
  ? parseInt(args[portIdx + 1], 10)
  : parseInt(process.env.BRAIN_PORT ?? '3000', 10)

const dbPath = process.env.BRAIN_DB_PATH ?? './brain.pglite'

// Embedding mode detection — first match wins
let embedding: EmbeddingProvider
let embeddingMode: string

if (process.env.OPENAI_API_KEY) {
  embedding = new OpenAIEmbedding(process.env.OPENAI_API_KEY)
  embeddingMode = 'openai (text-embedding-3-small, 1536 dim)'
} else if (process.env.OLLAMA_HOST || await isOllamaRunning()) {
  embedding = new OllamaEmbedding()
  embeddingMode = 'ollama (nomic-embed-text, 768 dim)'
} else {
  embedding = new NullEmbedding()
  embeddingMode = 'keyword-only (BM25, no semantic search)'
  process.stderr.write(
    '⚠  brain-kit: no embedding provider found.\n' +
    '   Running in keyword-only mode — semantic search and cache are disabled.\n' +
    '   To enable semantic search, set OPENAI_API_KEY or start Ollama.\n'
  )
}

async function isOllamaRunning(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(500) })
    return res.ok
  } catch {
    return false
  }
}

const engine = new PGliteEngine(embedding, {
  dbPath,
  cacheEnabled: process.env.BRAIN_CACHE_ENABLED !== 'false',
  graphEnabled: process.env.BRAIN_GRAPH_ENABLED !== 'false',
})

await engine.init()

process.on('SIGINT', async () => {
  await engine.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await engine.close()
  process.exit(0)
})

if (isHttp) {
  // Stateful HTTP mode: one transport per MCP session, all sessions share the engine.
  const transports = new Map<string, StreamableHTTPServerTransport>()

  async function handleHttp(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string))
    }
    const body = Buffer.concat(chunks).toString('utf-8')

    const incomingSessionId = req.headers['mcp-session-id'] as string | undefined

    if (incomingSessionId && transports.has(incomingSessionId)) {
      await transports.get(incomingSessionId)!.handleRequest(req, res, body)
      return
    }

    // New session
    const sessionId = randomUUID()
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
      onsessioninitialized: (sid) => {
        transports.set(sid, transport)
      },
    })

    const mcpServer = createBrainMCPServer(engine)
    await mcpServer.connect(transport)
    await transport.handleRequest(req, res, body)
  }

  const httpServer = createServer((req, res) => {
    handleHttp(req, res).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e)
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: msg }))
      }
    })
  })

  httpServer.listen(port, () => {
    process.stderr.write(`brain-kit MCP server (HTTP) listening on http://localhost:${port}\n`)
  })
} else {
  // stdio mode — default for Claude Code / Cursor integration
  const transport = new StdioServerTransport()
  const mcpServer = createBrainMCPServer(engine)
  await mcpServer.connect(transport)
  process.stderr.write(`brain-kit MCP server (stdio) started. DB: ${dbPath} | embedding: ${embeddingMode}\n`)
}
