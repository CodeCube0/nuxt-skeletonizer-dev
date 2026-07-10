import type { SkeletonAnimationTier, SkeletonRuntimeSignals } from '../../../types'

/**
 * The Adaptive decision function.
 *
 * Pure and synchronous: given the live signals and the tier proposed by the
 * Animation Microcontroller, it produces the concrete runtime decision —
 * animation tier and whether the shimmer runs — plus a list of explain codes
 * describing *why*. There is no rendering-strategy decision any more: SVG is the
 * only backend. Keeping this pure makes the adaptive behaviour unit-testable
 * without a DOM.
 */
export interface AdaptiveInput {
  signals: SkeletonRuntimeSignals
  /** Tier proposed by the Animation Microcontroller. */
  microTier: SkeletonAnimationTier
  config: {
    /** Whether the scope wants the shimmer at all. */
    shimmer: boolean
    /** Whether the Adaptive Animation System is enabled. */
    adaptive: boolean
  }
}

export interface AdaptiveDecision {
  animationTier: SkeletonAnimationTier
  shimmer: boolean
  /** Explain codes + details, applied in order. */
  reasons: Array<{ code: string, detail: Record<string, string | number> }>
}

/** CPU pressure above which the shimmer is auto-disabled (adaptive only). */
const SHIMMER_CPU_CEILING = 0.85

export function resolveDecision(input: AdaptiveInput): AdaptiveDecision {
  const { signals, microTier, config } = input
  const reasons: AdaptiveDecision['reasons'] = []

  // Without adaptive, the tier is `full` — unless the user prefers reduced
  // motion, which always pins to `static`.
  const animationTier: SkeletonAnimationTier = config.adaptive
    ? microTier
    : (signals.reducedMotion ? 'static' : 'full')

  let shimmer = config.shimmer
  if (config.adaptive && shimmer && signals.cpu >= SHIMMER_CPU_CEILING) {
    shimmer = false
    reasons.push({ code: 'disable:shimmer', detail: { cpu: signals.cpu.toFixed(2), fps: signals.fps } })
  }

  if (animationTier !== 'full') {
    reasons.push({ code: 'degrade:animation', detail: { tier: animationTier, fps: signals.fps } })
  }

  return { animationTier, shimmer, reasons }
}
