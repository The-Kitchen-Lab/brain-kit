import { PGlite } from '@electric-sql/pglite'
import { randomUUID } from 'crypto'
import { extractEntities } from './extractor.js'
import type { KnowledgeGraph, RelationshipType } from './interface.js'

const ENTITY_TO_REL: Partial<Record<string, RelationshipType>> = {
  wikilink: 'links_to',
  hashtag: 'tagged_with',
  mention: 'mentions',
  // url: intentionally omitted — no page-level relationship stored for URLs
}

export class PGliteKnowledgeGraph implements KnowledgeGraph {
  constructor(private readonly db: PGlite) {}

  async init(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS kg_entities (
        id          TEXT PRIMARY KEY,
        page_id     TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        value       TEXT NOT NULL,
        raw         TEXT NOT NULL
      )
    `)

    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS kg_entities_page_idx ON kg_entities (page_id)
    `)

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS kg_relationships (
        id             TEXT PRIMARY KEY,
        source_page_id TEXT NOT NULL,
        target_ref     TEXT NOT NULL,
        rel_type       TEXT NOT NULL
      )
    `)

    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS kg_rel_source_idx ON kg_relationships (source_page_id)
    `)

    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS kg_rel_target_idx ON kg_relationships (target_ref)
    `)
  }

  async extractAndStore(pageId: string, title: string, content: string): Promise<void> {
    // Clear stale entries first (upsert semantics on page update)
    await this.deleteForPage(pageId)

    const text = `${title}\n${content}`
    const raw = extractEntities(text)

    // Deduplicate by (type, value) — one entity/relationship per unique ref per page
    const seen = new Set<string>()
    for (const e of raw) {
      const key = `${e.type}:${e.value}`
      if (seen.has(key)) continue
      seen.add(key)

      await this.db.query(
        `INSERT INTO kg_entities (id, page_id, entity_type, value, raw)
         VALUES ($1, $2, $3, $4, $5)`,
        [randomUUID(), pageId, e.type, e.value, e.raw]
      )

      const relType = ENTITY_TO_REL[e.type]
      if (relType) {
        await this.db.query(
          `INSERT INTO kg_relationships (id, source_page_id, target_ref, rel_type)
           VALUES ($1, $2, $3, $4)`,
          [randomUUID(), pageId, e.value, relType]
        )
      }
    }
  }

  async getBacklinkCounts(
    pages: Array<{ id: string; title: string }>,
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>()
    if (pages.length === 0) return counts

    for (const p of pages) counts.set(p.id, 0)

    // Normalize titles to match stored target_refs (stored lowercase via extractor)
    const titleToId = new Map<string, string>()
    for (const p of pages) {
      titleToId.set(p.title.toLowerCase().trim(), p.id)
    }

    const refs = [...titleToId.keys()]
    if (refs.length === 0) return counts

    // Dynamic IN clause for the specific page title set
    const placeholders = refs.map((_, i) => `$${i + 1}`).join(', ')
    const result = await this.db.query<{ target_ref: string; cnt: string }>(
      `SELECT target_ref, COUNT(*) AS cnt
       FROM kg_relationships
       WHERE rel_type = 'links_to'
         AND target_ref IN (${placeholders})
       GROUP BY target_ref`,
      refs
    )

    for (const row of result.rows) {
      const pageId = titleToId.get(row.target_ref)
      if (pageId !== undefined) {
        counts.set(pageId, parseInt(row.cnt, 10))
      }
    }

    return counts
  }

  async deleteForPage(pageId: string): Promise<void> {
    await this.db.query('DELETE FROM kg_entities WHERE page_id = $1', [pageId])
    await this.db.query('DELETE FROM kg_relationships WHERE source_page_id = $1', [pageId])
  }

  async getEntitiesForPage(pageId: string): Promise<Array<{ id: string; entityType: string; value: string; raw: string }>> {
    const result = await this.db.query<{ id: string; entity_type: string; value: string; raw: string }>(
      'SELECT id, entity_type, value, raw FROM kg_entities WHERE page_id = $1',
      [pageId]
    )
    return result.rows.map(r => ({ id: r.id, entityType: r.entity_type, value: r.value, raw: r.raw }))
  }

  async getRelationshipsForPage(pageId: string): Promise<Array<{ id: string; targetRef: string; relType: string }>> {
    const result = await this.db.query<{ id: string; target_ref: string; rel_type: string }>(
      'SELECT id, target_ref, rel_type FROM kg_relationships WHERE source_page_id = $1',
      [pageId]
    )
    return result.rows.map(r => ({ id: r.id, targetRef: r.target_ref, relType: r.rel_type }))
  }

  async findBacklinkSources(targetRef: string): Promise<string[]> {
    const result = await this.db.query<{ source_page_id: string }>(
      `SELECT DISTINCT source_page_id FROM kg_relationships WHERE rel_type = 'links_to' AND target_ref = $1`,
      [targetRef.toLowerCase().trim()]
    )
    return result.rows.map(r => r.source_page_id)
  }

  async findPagesByEntityValue(entityType: string, value: string): Promise<string[]> {
    const result = await this.db.query<{ page_id: string }>(
      'SELECT DISTINCT page_id FROM kg_entities WHERE entity_type = $1 AND value = $2',
      [entityType, value.toLowerCase()]
    )
    return result.rows.map(r => r.page_id)
  }

  async getAllEntityValues(entityType: string): Promise<string[]> {
    const result = await this.db.query<{ value: string }>(
      'SELECT DISTINCT value FROM kg_entities WHERE entity_type = $1 ORDER BY value',
      [entityType]
    )
    return result.rows.map(r => r.value)
  }
}
