export interface QueryExpander {
  // Returns the original query plus any semantic variants.
  // First element MUST always be the original query.
  expand(query: string): Promise<string[]>
}
