import type { SkeletonExplainEntry } from '../../../types'

/**
 * Explain Mode (Step 3 §7).
 *
 * A ring buffer of natural-language explanations of the decisions the runtime
 * engine takes — cache hits, animation degradations, shimmer auto-disable.
 * DevTools and the docs surface these verbatim, e.g.
 *   "Blueprint SVG servito dalla cache — scansione saltata."
 *
 * Kept allocation-light and SSR-safe: timestamps are supplied by the caller.
 */
export class ExplainLog {
  private entries: SkeletonExplainEntry[] = []
  private seq = 0
  private subscribers = new Set<(e: SkeletonExplainEntry) => void>()

  constructor(private capacity = 100, private enabled = false) {}

  setEnabled(on: boolean): void {
    this.enabled = on
  }

  get isEnabled(): boolean {
    return this.enabled
  }

  /** Append an explanation. No-op while disabled (zero overhead). */
  push(code: string, message: string, at: number): SkeletonExplainEntry | null {
    if (!this.enabled) return null
    const entry: SkeletonExplainEntry = { seq: ++this.seq, code, message, at }
    this.entries.push(entry)
    if (this.entries.length > this.capacity) this.entries.shift()
    for (const fn of this.subscribers) fn(entry)
    return entry
  }

  /** Most recent entries (oldest → newest). */
  list(): readonly SkeletonExplainEntry[] {
    return this.entries
  }

  /** The single most recent entry, if any. */
  latest(): SkeletonExplainEntry | null {
    return this.entries[this.entries.length - 1] ?? null
  }

  subscribe(fn: (e: SkeletonExplainEntry) => void): () => void {
    this.subscribers.add(fn)
    return () => this.subscribers.delete(fn)
  }

  clear(): void {
    this.entries = []
  }
}

/**
 * Compose a standard explanation message from a decision code + signals so the
 * phrasing is consistent across the engine.
 */
export function explainDecision(
  code: string,
  detail: Record<string, string | number>,
): string {
  const parts = Object.entries(detail).map(([k, v]) => `${k}=${v}`)
  switch (code) {
    case 'cache:hit':
      return `Blueprint SVG servito dalla cache — scansione saltata (${parts.join(', ')}).`
    case 'degrade:animation': {
      const tier = String(detail.tier ?? '')
      if (tier === 'reduced') {
        return `Gradiente degradato a pulse: FPS sceso a ${detail.fps ?? '?'}.`
      }
      if (tier === 'static') {
        return `Animazione disattivata (fill statico): FPS sceso a ${detail.fps ?? '?'}.`
      }
      return `Animazione degradata: ${parts.join(', ')}.`
    }
    case 'disable:shimmer':
      return `Shimmer disattivato per stress hardware: ${parts.join(', ')}.`
    default:
      return `${code}: ${parts.join(', ')}`
  }
}
