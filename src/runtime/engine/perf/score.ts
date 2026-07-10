import type { SkeletonRuntimeSignals } from '../../../types'

/**
 * The Performance Score Engine (Step 3 §1).
 *
 * Folds the live runtime signals into a single composite health score in
 * `[0,100]` (higher = healthier). The adaptive controller and the Policy
 * Engine use the score and its sub-components to decide when to degrade,
 * cluster, switch backend or disable the shimmer.
 *
 * The weights are deliberately simple and explainable — Explain Mode quotes
 * the dominant penalty when narrating a decision.
 */

export interface PerformanceScore {
  /** Composite score in [0,100]. */
  value: number
  /** FPS sub-score in [0,100]. */
  fps: number
  /** CPU headroom sub-score in [0,100]. */
  cpu: number
  /** Memory headroom sub-score in [0,100]. */
  memory: number
  /** Structural-complexity sub-score in [0,100]. */
  complexity: number
  /** The dominant penalty driver, e.g. `'fps'` — used by Explain Mode. */
  bottleneck: 'fps' | 'cpu' | 'memory' | 'complexity' | 'none'
}

export interface ScoreThresholds {
  /** FPS at or below which the fps sub-score hits 0. */
  minFps: number
  /** Bone count treated as "heavy" (complexity sub-score halves around here). */
  heavyNodes: number
  /** Heap (MB) treated as the soft ceiling for the memory sub-score. */
  memoryCeilingMB: number
}

export const DEFAULT_THRESHOLDS: ScoreThresholds = {
  minFps: 45,
  heavyNodes: 1500,
  memoryCeilingMB: 512,
}

function clamp100(n: number): number {
  return Math.min(100, Math.max(0, n))
}

/**
 * Compute the composite performance score from live signals.
 *
 * - FPS:        linear from `minFps` (→0) to 60 (→100).
 * - CPU:        `(1 - cpu) * 100` (pressure inverts to headroom).
 * - Memory:     headroom against the soft ceiling.
 * - Complexity: decays as bone count passes `heavyNodes`.
 */
export function computeScore(
  signals: Pick<SkeletonRuntimeSignals, 'fps' | 'cpu' | 'memoryMB' | 'boneCount'>,
  thresholds: ScoreThresholds = DEFAULT_THRESHOLDS,
): PerformanceScore {
  const { minFps, heavyNodes, memoryCeilingMB } = thresholds

  const fpsScore = clamp100(((signals.fps - minFps) / (60 - minFps)) * 100)
  const cpuScore = clamp100((1 - signals.cpu) * 100)
  const memoryScore = memoryCeilingMB > 0
    ? clamp100((1 - signals.memoryMB / memoryCeilingMB) * 100)
    : 100
  // Smoothly decays: 100 at 0 nodes, ~50 at heavyNodes, →0 well beyond it.
  const complexityScore = clamp100(100 / (1 + signals.boneCount / Math.max(1, heavyNodes)))

  // Weighted blend. FPS and CPU dominate because they map most directly to the
  // user-perceived smoothness the engine optimizes for.
  const value = clamp100(
    fpsScore * 0.4 + cpuScore * 0.3 + complexityScore * 0.2 + memoryScore * 0.1,
  )

  const subs: Array<[PerformanceScore['bottleneck'], number]> = [
    ['fps', fpsScore],
    ['cpu', cpuScore],
    ['memory', memoryScore],
    ['complexity', complexityScore],
  ]
  let bottleneck: PerformanceScore['bottleneck'] = 'none'
  let worst = 70 // only call out a bottleneck once a sub-score is genuinely low
  for (const [name, sub] of subs) {
    if (sub < worst) {
      worst = sub
      bottleneck = name
    }
  }

  return {
    value: Math.round(value),
    fps: Math.round(fpsScore),
    cpu: Math.round(cpuScore),
    memory: Math.round(memoryScore),
    complexity: Math.round(complexityScore),
    bottleneck,
  }
}

/** Read an estimate of the JS heap in MB (Chromium-only; 0 elsewhere). */
export function readMemoryMB(): number {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
  if (mem && typeof mem.usedJSHeapSize === 'number') {
    return Math.round(mem.usedJSHeapSize / (1024 * 1024))
  }
  return 0
}

/** Logical CPU cores, or 0 when unknown. */
export function readCores(): number {
  return typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number'
    ? navigator.hardwareConcurrency
    : 0
}

/** Whether the user prefers reduced motion (SSR-safe). */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches
}
