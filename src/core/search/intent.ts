/**
 * intent.ts — Zero-LLM query intent classifier.
 *
 * Classifies queries into 4 intents that drive search strategy:
 *
 *   entity   — query targets a named entity (person, tag, wikilink)
 *              → graph entity lookup + entity-match boost
 *   temporal — query involves time / recency ("last week", "recent")
 *              → recency scoring blended into RRF
 *   event    — query asks about an occurrence ("when did X deploy")
 *              → keyword-heavy weights + recency scoring
 *   general  — default semantic search, no special routing
 */

export type QueryIntent = 'entity' | 'temporal' | 'event' | 'general'

export interface IntentResult {
  intent: QueryIntent
  confidence: number   // 0–1
  signals: string[]    // matched pattern labels (debug / bench)
}

// ── Pattern tables ────────────────────────────────────────────────────────────

const ENTITY_PATTERNS: Array<[RegExp, string]> = [
  [/\[\[.+?\]\]/, 'wikilink'],
  [/(?:^|[\s,;(])@[a-zA-Z][a-zA-Z0-9_.:-]*/, 'mention'],
  [/#[a-zA-Z][a-zA-Z0-9_/-]*/, 'hashtag'],
  [/\b(who is|who are|about|find|show me|tell me about)\s+[A-Z]/i, 'entity-phrase'],
  [/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/, 'proper-name'],
]

const TEMPORAL_PATTERNS: Array<[RegExp, string]> = [
  [/\b(yesterday|today|tomorrow|tonight)\b/i, 'relative-day'],
  [/\b(last|this|next)\s+(week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, 'relative-period'],
  [/\b(recent|latest|newest|oldest|earliest|current)\b/i, 'recency-word'],
  [/\b(before|after|since|until|from|between)\b/i, 'temporal-prep'],
  [/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i, 'month-name'],
  [/\b(jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/i, 'month-abbr'],
  [/\d{4}[-/]\d{1,2}[-/]\d{1,2}/, 'iso-date'],
  [/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/, 'date-format'],
  [/\b\d+\s*(hours?|days?|weeks?|months?|years?)\s*ago\b/i, 'relative-ago'],
]

const EVENT_PATTERNS: Array<[RegExp, string]> = [
  [/\b(when did|when was|when were|when will|when is)\b/i, 'when-did'],
  [/\b(launched|deployed|released|shipped|completed|finished|published|merged|deleted)\b/i, 'action-past'],
  [/\b(started|ended|began|stopped|closed|opened|broke|fixed|happened|occurred)\b/i, 'action-past-2'],
  [/\b(created|updated|changed|modified|committed|pushed|pulled|tagged)\b/i, 'dev-action'],
]

const SCORE_WEIGHTS = { entity: 0.45, temporal: 0.35, event: 0.55 }
const INTENT_THRESHOLD = 0.35

// ── Classifier ────────────────────────────────────────────────────────────────

export function classifyIntent(query: string): IntentResult {
  const signals: string[] = []

  let entityScore = 0
  let temporalScore = 0
  let eventScore = 0

  for (const [pattern, label] of ENTITY_PATTERNS) {
    if (pattern.test(query)) {
      entityScore += SCORE_WEIGHTS.entity
      signals.push(`entity:${label}`)
    }
  }

  for (const [pattern, label] of TEMPORAL_PATTERNS) {
    if (pattern.test(query)) {
      temporalScore += SCORE_WEIGHTS.temporal
      signals.push(`temporal:${label}`)
    }
  }

  for (const [pattern, label] of EVENT_PATTERNS) {
    if (pattern.test(query)) {
      eventScore += SCORE_WEIGHTS.event
      signals.push(`event:${label}`)
    }
  }

  // Temporal evidence amplifies event score (e.g. "when did X deploy last month")
  if (temporalScore > 0 && eventScore > 0) {
    eventScore = Math.min(eventScore + 0.25, 1.0)
  }

  entityScore  = Math.min(entityScore,  1.0)
  temporalScore = Math.min(temporalScore, 1.0)
  eventScore   = Math.min(eventScore,   1.0)

  const max = Math.max(entityScore, temporalScore, eventScore)

  if (max < INTENT_THRESHOLD) {
    return { intent: 'general', confidence: 1 - max, signals }
  }

  if (eventScore === max) {
    return { intent: 'event', confidence: eventScore, signals }
  }
  if (temporalScore === max) {
    return { intent: 'temporal', confidence: temporalScore, signals }
  }
  return { intent: 'entity', confidence: entityScore, signals }
}
