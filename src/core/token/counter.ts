import { getEncoding, type Tiktoken } from 'js-tiktoken'

// cl100k_base: GPT-4 + Claude compatible BPE tokenizer.
// Accurate within ~5% for Claude models vs GBrain's 4-chars/token heuristic.
export class TokenCounter {
  private readonly enc: Tiktoken

  constructor() {
    this.enc = getEncoding('cl100k_base')
  }

  count(text: string): number {
    return this.enc.encode(text).length
  }

  countBatch(texts: string[]): number[] {
    return texts.map(t => this.count(t))
  }

  // No-op: js-tiktoken's pure-JS Tiktoken has no WASM memory to free.
  free(): void {}
}
