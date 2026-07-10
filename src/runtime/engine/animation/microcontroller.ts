import type { SkeletonAnimationTier, SkeletonRuntimeSignals } from '../../../types'

/**
 * Animation Microcontroller & Adaptive Animation System (Step 3 §5).
 *
 * Owns the active animation tier and steps it up/down the degradation ladder
 * (`full` → `reduced` → `static`) based on live FPS/CPU, with hysteresis and a
 * minimum dwell time so the animation never visibly "flaps" between tiers.
 *
 * - drop a tier when FPS falls below `minFps` or CPU pressure is high
 * - recover a tier only after sustained healthy frames (hysteresis margin)
 * - reduced-motion preference always pins to `static`
 */
const LADDER: SkeletonAnimationTier[] = ['full', 'reduced', 'static']

export interface MicrocontrollerOptions {
  minFps: number
  /** FPS recovery must exceed `minFps * (1 + margin)` to step back up. */
  hysteresis?: number
  /** Minimum ms a tier must hold before another change is allowed. */
  dwellMs?: number
  /** CPU pressure above which the tier is forced down. */
  cpuCeiling?: number
}

export class AnimationMicrocontroller {
  private idx = 0
  // Negative infinity so the very first update is never blocked by dwell time.
  private lastChangeAt = Number.NEGATIVE_INFINITY
  private readonly minFps: number
  private readonly hysteresis: number
  private readonly dwellMs: number
  private readonly cpuCeiling: number

  constructor(opts: MicrocontrollerOptions) {
    this.minFps = opts.minFps
    this.hysteresis = opts.hysteresis ?? 0.25
    this.dwellMs = opts.dwellMs ?? 600
    this.cpuCeiling = opts.cpuCeiling ?? 0.8
  }

  /** The current tier. */
  get tier(): SkeletonAnimationTier {
    return LADDER[this.idx]!
  }

  /** Force a specific tier (e.g. from a policy patch). Resets dwell. */
  force(tier: SkeletonAnimationTier, at: number): void {
    const next = LADDER.indexOf(tier)
    if (next >= 0 && next !== this.idx) {
      this.idx = next
      this.lastChangeAt = at
    }
  }

  /**
   * Feed live signals and return the (possibly changed) tier. `at` is a caller
   * supplied monotonic timestamp (ms) to keep this pure/SSR-safe.
   */
  update(signals: SkeletonRuntimeSignals, at: number): SkeletonAnimationTier {
    if (signals.reducedMotion) {
      this.idx = LADDER.length - 1
      return this.tier
    }
    // Respect dwell time to avoid flapping.
    if (at - this.lastChangeAt < this.dwellMs) return this.tier

    const unhealthy = (signals.fps > 0 && signals.fps < this.minFps) || signals.cpu >= this.cpuCeiling
    const healthy = signals.fps === 0 || (signals.fps > this.minFps * (1 + this.hysteresis) && signals.cpu < this.cpuCeiling * 0.7)

    if (unhealthy && this.idx < LADDER.length - 1) {
      this.idx++
      this.lastChangeAt = at
    }
    else if (healthy && this.idx > 0) {
      this.idx--
      this.lastChangeAt = at
    }
    return this.tier
  }
}

/** Map a tier to the animation preset name used by the CSS layer. */
export function tierToAnimation(tier: SkeletonAnimationTier, base: string): string {
  switch (tier) {
    case 'static': return 'none'
    case 'reduced': return 'pulse'
    case 'full': return base
  }
}
