import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { PGliteEngine } from '../core/storage/pglite.js'
import { TokenCounter } from '../core/token/counter.js'
import { extractEntities } from '../core/graph/extractor.js'

const ENTITY_TYPES = ['wikilink', 'hashtag', 'mention', 'url'] as const

const TOOLS = [
  {
    name: 'brain_put',
    description: 'Create or update a page in the brain. Uses upsert semantics — if id exists, the page is updated.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Page title' },
        content: { type: 'string', description: 'Page content (markdown supported)' },
        id: { type: 'string', description: 'Optional page ID. Auto-generated (UUID) if omitted.' },
        metadata: { type: 'object', description: 'Optional key-value metadata attached to the page' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'brain_get',
    description: 'Retrieve a page by its ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Page ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'brain_delete',
    description: 'Delete a page by its ID. Also removes its graph entities and relationships.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Page ID to delete' },
      },
      required: ['id'],
    },
  },
  {
    name: 'brain_list',
    description: 'List pages ordered by creation time (newest first) with optional pagination.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Max pages to return (default: 50)' },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
      },
    },
  },
  {
    name: 'brain_count',
    description: 'Return the total number of pages stored in the brain.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'brain_bulk_put',
    description: 'Create or update multiple pages in a single call. Returns a summary of imported vs failed.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pages: {
          type: 'array',
          description: 'Array of page objects to create/update',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              content: { type: 'string' },
              id: { type: 'string' },
              metadata: { type: 'object' },
            },
            required: ['title', 'content'],
          },
        },
      },
      required: ['pages'],
    },
  },
  {
    name: 'brain_update_metadata',
    description: 'Update only the metadata of a page without touching its content or re-embedding.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Page ID' },
        metadata: { type: 'object', description: 'New metadata to set (replaces existing metadata)' },
      },
      required: ['id', 'metadata'],
    },
  },
  {
    name: 'brain_search',
    description: 'Hybrid search combining vector (semantic) and keyword (BM25) search with RRF ranking. Enforces a token budget on results.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Natural language search query' },
        limit: { type: 'number', description: 'Max results before token budget cut (default: 20)' },
        tokenBudget: { type: 'number', description: 'Max total tokens across all results (default: 2000)' },
        minScore: { type: 'number', description: 'Minimum RRF score threshold (0-1, optional)' },
        skipCache: { type: 'boolean', description: 'Bypass semantic cache for this query (default: false)' },
        skipGraphBoost: { type: 'boolean', description: 'Disable backlink-based re-ranking (default: false)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'brain_similar',
    description: 'Find pages semantically similar to a given page using its stored embedding (no extra API call).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Source page ID' },
        limit: { type: 'number', description: 'Max results (default: 10)' },
        tokenBudget: { type: 'number', description: 'Max total tokens across all results (default: 2000)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'brain_search_by_tag',
    description: 'Find pages that contain a specific hashtag (e.g. "ai", "project/alpha"). Uses knowledge graph index.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tag: { type: 'string', description: 'Hashtag value without the # prefix (e.g. "ai", "project/alpha")' },
      },
      required: ['tag'],
    },
  },
  {
    name: 'brain_graph_entities',
    description: 'List all entities (wikilinks, hashtags, mentions, URLs) extracted from a page.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pageId: { type: 'string', description: 'Page ID' },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'brain_graph_relationships',
    description: 'List outgoing relationships from a page (links_to, tagged_with, mentions).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pageId: { type: 'string', description: 'Source page ID' },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'brain_graph_backlinks',
    description: 'Find page IDs that contain a wikilink pointing to the given title.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Target page title to find backlinks for' },
      },
      required: ['title'],
    },
  },
  {
    name: 'brain_graph_find_by_entity',
    description: 'Find page IDs that contain a specific entity value of a given type.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        entityType: { type: 'string', enum: [...ENTITY_TYPES], description: 'Entity type to filter by' },
        value: { type: 'string', description: 'Entity value to search for (case-insensitive)' },
      },
      required: ['entityType', 'value'],
    },
  },
  {
    name: 'brain_graph_all_entities',
    description: 'List all distinct entity values of a given type across the entire knowledge base.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        entityType: { type: 'string', enum: [...ENTITY_TYPES], description: 'Entity type (wikilink, hashtag, mention, url)' },
      },
      required: ['entityType'],
    },
  },
  {
    name: 'brain_cache_clear',
    description: 'Wipe all semantic cache entries. Use after bulk writes that change the knowledge base significantly.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'brain_cache_clean',
    description: 'Remove expired cache entries older than the given TTL.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ttlSeconds: { type: 'number', description: 'TTL threshold in seconds (default: 3600)' },
      },
    },
  },
  {
    name: 'brain_token_count',
    description: 'Count the number of tokens in a text using cl100k_base (GPT-4/Claude compatible BPE tokenizer).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        text: { type: 'string', description: 'Text to count tokens for' },
      },
      required: ['text'],
    },
  },
  {
    name: 'brain_extract_entities',
    description: 'Extract wikilinks, hashtags, @mentions, and URLs from text without storing anything.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        text: { type: 'string', description: 'Text to extract entities from' },
      },
      required: ['text'],
    },
  },
  {
    name: 'brain_stats',
    description: 'Return database statistics: page count, cache entries, entity count, relationship count.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'brain_export',
    description: 'Export all pages as a JSON array ordered by creation time. Useful for backups.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'brain_import',
    description: 'Import pages from a JSON array. Uses upsert — existing IDs are updated. Returns import summary.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pages: {
          type: 'array',
          description: 'Array of page objects to import',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              content: { type: 'string' },
              id: { type: 'string' },
              metadata: { type: 'object' },
            },
            required: ['title', 'content'],
          },
        },
      },
      required: ['pages'],
    },
  },
]

function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

function err(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true as const }
}

function str(a: Record<string, unknown>, key: string): string {
  return a[key] as string
}

function num(a: Record<string, unknown>, key: string, fallback?: number): number | undefined {
  const v = a[key]
  if (v === undefined || v === null) return fallback
  return Number(v)
}

function bool(a: Record<string, unknown>, key: string): boolean | undefined {
  const v = a[key]
  if (v === undefined || v === null) return undefined
  return Boolean(v)
}

export function createBrainMCPServer(
  engine: PGliteEngine,
  opts: { name?: string; version?: string } = {},
): Server {
  const server = new Server(
    { name: opts.name ?? 'brain-kit', version: opts.version ?? '0.1.0' },
    { capabilities: { tools: {} } },
  )

  const tokenCounter = new TokenCounter()

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    const a = (args ?? {}) as Record<string, unknown>

    try {
      switch (name) {
        case 'brain_put': {
          const page = await engine.put({
            id: a.id as string | undefined,
            title: str(a, 'title'),
            content: str(a, 'content'),
            metadata: a.metadata as Record<string, unknown> | undefined,
          })
          return ok(page)
        }

        case 'brain_get': {
          const page = await engine.get(str(a, 'id'))
          if (!page) return ok(null)
          return ok(page)
        }

        case 'brain_delete': {
          await engine.delete(str(a, 'id'))
          return ok({ deleted: true })
        }

        case 'brain_list': {
          const pages = await engine.list({
            limit: num(a, 'limit', 50),
            offset: num(a, 'offset', 0),
          })
          return ok(pages)
        }

        case 'brain_count': {
          const count = await engine.count()
          return ok({ count })
        }

        case 'brain_bulk_put': {
          const inputs = a.pages as Array<{ title: string; content: string; id?: string; metadata?: Record<string, unknown> }>
          const result = await engine.importBulk(inputs)
          return ok(result)
        }

        case 'brain_update_metadata': {
          const page = await engine.updateMetadata(
            str(a, 'id'),
            (a.metadata ?? {}) as Record<string, unknown>,
          )
          if (!page) return ok(null)
          return ok(page)
        }

        case 'brain_search': {
          const results = await engine.search(str(a, 'query'), {
            limit: num(a, 'limit'),
            tokenBudget: num(a, 'tokenBudget'),
            minScore: num(a, 'minScore'),
            skipCache: bool(a, 'skipCache'),
            skipGraphBoost: bool(a, 'skipGraphBoost'),
          })
          return ok(results)
        }

        case 'brain_similar': {
          const results = await engine.similar(str(a, 'id'), {
            limit: num(a, 'limit'),
            tokenBudget: num(a, 'tokenBudget'),
          })
          return ok(results)
        }

        case 'brain_search_by_tag': {
          const tag = str(a, 'tag').toLowerCase().replace(/^#/, '')
          const pageIds = await engine.findPagesByEntity('hashtag', tag)
          const pages = await Promise.all(pageIds.map(id => engine.get(id)))
          return ok(pages.filter(Boolean))
        }

        case 'brain_graph_entities': {
          const entities = await engine.getGraphEntities(str(a, 'pageId'))
          return ok(entities)
        }

        case 'brain_graph_relationships': {
          const rels = await engine.getGraphRelationships(str(a, 'pageId'))
          return ok(rels)
        }

        case 'brain_graph_backlinks': {
          const pageIds = await engine.getGraphBacklinks(str(a, 'title'))
          return ok({ pageIds, count: pageIds.length })
        }

        case 'brain_graph_find_by_entity': {
          const pageIds = await engine.findPagesByEntity(str(a, 'entityType'), str(a, 'value'))
          return ok({ pageIds, count: pageIds.length })
        }

        case 'brain_graph_all_entities': {
          const values = await engine.getAllEntityValues(str(a, 'entityType'))
          return ok({ entityType: str(a, 'entityType'), values, count: values.length })
        }

        case 'brain_cache_clear': {
          await engine.clearCache()
          return ok({ cleared: true })
        }

        case 'brain_cache_clean': {
          const removed = await engine.cleanCache(num(a, 'ttlSeconds'))
          return ok({ removed })
        }

        case 'brain_token_count': {
          const tokens = tokenCounter.count(str(a, 'text'))
          return ok({ tokens })
        }

        case 'brain_extract_entities': {
          const entities = extractEntities(str(a, 'text'))
          return ok(entities)
        }

        case 'brain_stats': {
          const stats = await engine.stats()
          return ok(stats)
        }

        case 'brain_export': {
          const pages = await engine.exportAll()
          return ok(pages)
        }

        case 'brain_import': {
          const inputs = a.pages as Array<{ title: string; content: string; id?: string; metadata?: Record<string, unknown> }>
          const result = await engine.importBulk(inputs)
          return ok(result)
        }

        default:
          return err(new Error(`Unknown tool: ${name}`))
      }
    } catch (e) {
      return err(e)
    }
  })

  return server
}
