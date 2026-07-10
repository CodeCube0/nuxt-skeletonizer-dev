import { computed, inject, type ComputedRef } from 'vue'
import type {
  SkeletonExplainEntry,
  SkeletonizerStats,
  SvgBlueprint,
} from '../../types'
import type { HostCost } from '../engine/devtools/bottleneck'
import type { SkeletonEngine } from '../engine/pipeline'
import type { TelemetryAggregate } from '../engine/telemetry/telemetry'
import { getActiveStore, SKELETONIZER_KEY, type SkeletonizerStore } from '../state'

/**
 * The advanced performance / DevTools surface.
 *
 * Exposes the live telemetry, Explain Mode log, bottleneck ranking and the most
 * recently generated SVG blueprint (the "Blueprint Inspector"). Designed to back
 * a Nuxt DevTools panel or an in-app diagnostics dashboard. There are no render
 * strategy or policy controls — SVG is the only backend.
 */
export interface UseSkeletonPerformanceReturn {
  /** Reactive aggregate stats (renderMode, score, fps, tier, cache, timings). */
  stats: SkeletonizerStats
  /** The underlying engine (for power users). */
  engine: SkeletonEngine
  /** Snapshot of the telemetry aggregate. */
  telemetry: () => TelemetryAggregate
  /** A live metric series for sparklines. */
  series: (metric: 'fps' | 'memoryMB' | 'cpu' | 'boneCount', n?: number) => number[]
  /** Natural-language explanations of recent engine decisions (Explain Mode). */
  explanations: () => readonly SkeletonExplainEntry[]
  /** The most recent explanation, if any. */
  lastExplanation: ComputedRef<SkeletonExplainEntry | null>
  /** Hosts ranked by skeletonization cost (slowest first). */
  bottlenecks: () => HostCost[]
  /** Cache hit/miss ratio in [0,1]. */
  cacheHitRatio: ComputedRef<number>
  /** The most recently generated SVG blueprint (Blueprint Inspector). */
  blueprint: () => SvgBlueprint | null
}

function resolveStore(): SkeletonizerStore {
  const store = inject(SKELETONIZER_KEY, null) ?? getActiveStore()
  if (!store) {
    throw new Error('[nuxt-skeletonizer] useSkeletonPerformance() called before the plugin initialised.')
  }
  return store
}

export function useSkeletonPerformance(): UseSkeletonPerformanceReturn {
  const store = resolveStore()
  const engine = store.engine
  return {
    stats: store.stats,
    engine,
    telemetry: () => engine.telemetry.aggregate(),
    series: (metric, n) => engine.telemetry.series(metric, n),
    explanations: () => engine.explain.list(),
    lastExplanation: computed(() => engine.explain.latest()),
    bottlenecks: () => engine.bottleneck.ranked(),
    cacheHitRatio: computed(() => {
      const { cacheHits, cacheMisses } = store.stats
      const total = cacheHits + cacheMisses
      return total === 0 ? 0 : cacheHits / total
    }),
    blueprint: () => engine.lastResult?.blueprint ?? null,
  }
}
