import type { BrainPage, BrainPageInput, SearchResult, SearchOptions } from './types.js'

export interface BrainEngine {
  init(): Promise<void>
  put(input: BrainPageInput): Promise<BrainPage>
  get(id: string): Promise<BrainPage | null>
  search(query: string, opts?: SearchOptions): Promise<SearchResult[]>
  delete(id: string): Promise<void>
  close(): Promise<void>
}
