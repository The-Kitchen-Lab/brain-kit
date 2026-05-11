export type EntityType = 'wikilink' | 'hashtag' | 'mention' | 'url'
export type RelationshipType = 'links_to' | 'tagged_with' | 'mentions'

export interface Entity {
  id: string
  pageId: string
  entityType: EntityType
  value: string
  raw: string
}

export interface Relationship {
  id: string
  sourcePageId: string
  targetRef: string
  relType: RelationshipType
}

export interface KnowledgeGraph {
  init(): Promise<void>
  extractAndStore(pageId: string, title: string, content: string): Promise<void>
  getBacklinkCounts(pages: Array<{ id: string; title: string }>): Promise<Map<string, number>>
  deleteForPage(pageId: string): Promise<void>
}
