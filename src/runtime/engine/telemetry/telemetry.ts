import type { SkeletonStageTimings } from '../../../types'

/**
 * Telemetry & Runtime Intelligence (Step 3 §6).
 *
 * A lightweight, allocation-frugal collector for the core engine metrics:
 * per-stage timings, FPS, memory footprint, cache hit/miss ratio and node
 * counts. It keeps a small ring buffer of recent samples (for sparklines /
 * DevTools) and exposes a feedback hook the Adaptive Engine subscribes to so
 * the telemetry → policy → render loop is closed.
 */
export interface TelemetrySample {
  at: number
  timings: SkeletonStageTimings
  fps: number
  cpu: number
  memoryMB: number
  boneCount: number
  strategy: string
}

export interface TelemetryAggregate {
  /** Samples recorded since load. */
  count: number
  /** Mean total pipeline time (ms). */
  avgTotalMs: number
  /** Mean scan time (ms). */
  avgScanMs: number
  /** Mean render time (ms). */
  avgRenderMs: number
  /** Cache hit ratio in [0,1]. */
  cacheHitRatio: number
  /** Worst (max) total time observed (ms). */
  maxTotalMs: number
}

export class TelemetryCollector {
  private buffer: TelemetrySample[] = []
  private cacheHits = 0
  private cacheMisses = 0
  private subscribers = new Set<(s: TelemetrySample) => void>()

  constructor(private capacity = 120) {}

  /** Record a pipeline sample (ring-buffered) and notify subscribers. */
  record(sample: TelemetrySample): void {
    this.buffer.push(sample)
    if (this.buffer.length > this.capacity) this.buffer.shift()
    for (const fn of this.subscribers) fn(sample)
  }

  /** Note a cache hit/miss for the running ratio. */
  noteCache(hit: boolean): void {
    if (hit) this.cacheHits++
    else this.cacheMisses++
  }

  /** Subscribe to live samples (feedback loop into the adaptive engine). */
  subscribe(fn: (s: TelemetrySample) => void): () => void {
    this.subscribers.add(fn)
    return () => this.subscribers.delete(fn)
  }

  /** Most recent N samples (oldest → newest). */
  recent(n = this.capacity): TelemetrySample[] {
    return this.buffer.slice(-n)
  }

  /** A specific metric series for sparklines. */
  series(metric: 'fps' | 'memoryMB' | 'cpu' | 'boneCount', n = 60): number[] {
    return this.recent(n).map((s) => {
      if (metric === 'fps') return s.fps
      if (metric === 'memoryMB') return s.memoryMB
      if (metric === 'cpu') return s.cpu
      return s.boneCount
    })
  }

  /** Aggregate statistics across the buffer. */
  aggregate(): TelemetryAggregate {
    const n = this.buffer.length
    if (n === 0) {
      return { count: 0, avgTotalMs: 0, avgScanMs: 0, avgRenderMs: 0, cacheHitRatio: 0, maxTotalMs: 0 }
    }
    let total = 0
    let scan = 0
    let render = 0
    let maxTotal = 0
    for (const s of this.buffer) {
      total += s.timings.totalMs
      scan += s.timings.scanMs
      render += s.timings.renderMs
      if (s.timings.totalMs > maxTotal) maxTotal = s.timings.totalMs
    }
    const cacheTotal = this.cacheHits + this.cacheMisses
    return {
      count: n,
      avgTotalMs: round2(total / n),
      avgScanMs: round2(scan / n),
      avgRenderMs: round2(render / n),
      cacheHitRatio: cacheTotal === 0 ? 0 : round2(this.cacheHits / cacheTotal),
      maxTotalMs: round2(maxTotal),
    }
  }

  get cacheStats(): { hits: number, misses: number } {
    return { hits: this.cacheHits, misses: this.cacheMisses }
  }

  reset(): void {
    this.buffer = []
    this.cacheHits = 0
    this.cacheMisses = 0
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
