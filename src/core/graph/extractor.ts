export type EntityType = 'wikilink' | 'hashtag' | 'mention' | 'url'

export interface ExtractedEntity {
  type: EntityType
  value: string
  raw: string
}

// Obsidian/Roam wikilinks: [[page]], [[page|alias]], [[page#heading]]
const WIKILINK_RE = /\[\[([^\]|#\n]+?)(?:[|#][^\]]*?)?\]\]/g

// Hashtags: #tag, #tag/subtag (must start with a letter)
const HASHTAG_RE = /#([a-zA-Z][a-zA-Z0-9_/-]*)/g

// @mentions — must follow whitespace or punctuation to avoid matching emails (user@host)
const MENTION_RE = /(?:^|[\s,;(])@([a-zA-Z][a-zA-Z0-9_.:-]*)/gm

// HTTP/HTTPS URLs
const URL_RE = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g

// Replace wikilink spans with spaces of the same length so downstream regexes
// don't match hashtags/mentions that appear inside [[page#heading]] patterns.
function maskWikilinks(text: string): { masked: string; entities: ExtractedEntity[] } {
  const entities: ExtractedEntity[] = []
  const parts: string[] = []
  let lastIndex = 0

  const re = new RegExp(WIKILINK_RE.source, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    parts.push(text.slice(lastIndex, m.index))
    parts.push(' '.repeat(m[0].length))
    lastIndex = m.index + m[0].length
    entities.push({
      type: 'wikilink',
      value: m[1].trim().toLowerCase(),
      raw: m[0],
    })
  }
  parts.push(text.slice(lastIndex))

  return { masked: parts.join(''), entities }
}

export function extractEntities(text: string): ExtractedEntity[] {
  // Extract wikilinks first and mask their spans to prevent false positive
  // hashtag/mention matches inside [[page#heading]] or [[page|alias]] syntax.
  const { masked, entities } = maskWikilinks(text)

  for (const match of masked.matchAll(HASHTAG_RE)) {
    entities.push({
      type: 'hashtag',
      value: match[1].toLowerCase(),
      raw: match[0],
    })
  }

  for (const match of masked.matchAll(MENTION_RE)) {
    entities.push({
      type: 'mention',
      value: match[1].toLowerCase(),
      raw: match[0],
    })
  }

  for (const match of masked.matchAll(URL_RE)) {
    entities.push({
      type: 'url',
      value: match[0],
      raw: match[0],
    })
  }

  return entities
}
