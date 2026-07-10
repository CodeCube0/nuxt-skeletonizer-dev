import { cancelRaf, now, raf } from '../clock'

/**
 * A frame-rate sampler built on `requestAnimationFrame`.
 *
 * **TAR compliance (Step 3 §1):** the rAF loop is *only* alive between
 * {@link FpsSampler.start} and {@link FpsSampler.stop}. The adaptive controller
 * starts it when loading/transition begins and stops it the instant the real
 * component hydrates, so the steady-state overhead is exactly zero.
 *
 * Besides FPS it derives a cheap CPU-pressure estimate from frame-time jitter:
 * the more frames overrun the 16.7 ms budget, the higher the pressure.
 */
export class FpsSampler {
  private rafId: number | null = null
  private last = 0
  /** Exponential moving average of instantaneous FPS. */
  private emaFps = 60
  /** Exponential moving average of normalized frame overrun in [0,1]. */
  private emaPressure = 0
  private running = false
  /** Smoothing factor for the EMAs (0..1, higher = more reactive). */
  private readonly alpha: number
  private readonly onSample?: (fps: number, cpu: number) => void

  constructor(opts: { alpha?: number, onSample?: (fps: number, cpu: number) => void } = {}) {
    this.alpha = opts.alpha ?? 0.1
    this.onSample = opts.onSample
  }

  /** True while the rAF loop is active. */
  get active(): boolean {
    return this.running
  }

  /** Smoothed frames-per-second. Resets to a neutral 60 between runs. */
  get fps(): number {
    return Math.round(this.emaFps)
  }

  /** Heuristic CPU pressure in [0,1] (1 = heavily saturated). */
  get cpu(): number {
    return Math.min(1, Math.max(0, this.emaPressure))
  }

  /** Begin sampling. Idempotent. No-op without `requestAnimationFrame`. */
  start(): void {
    if (this.running) return
    if (typeof requestAnimationFrame !== 'function') return
    this.running = true
    this.last = now()
    this.emaFps = 60
    this.emaPressure = 0
    this.tick(this.last)
  }

  /** Stop sampling and tear down the rAF loop (zero steady-state overhead). */
  stop(): void {
    this.running = false
    if (this.rafId !== null) {
      cancelRaf(this.rafId)
      this.rafId = null
    }
  }

  private tick = (t: number): void => {
    if (!this.running) return
    const delta = t - this.last
    this.last = t
    if (delta > 0) {
      const instantFps = 1000 / delta
      this.emaFps = this.emaFps + this.alpha * (instantFps - this.emaFps)
      // Frame budget is ~16.67 ms at 60 Hz. Overrun beyond it maps to pressure.
      const overrun = Math.min(1, Math.max(0, (delta - 16.67) / 50))
      this.emaPressure = this.emaPressure + this.alpha * (overrun - this.emaPressure)
      this.onSample?.(this.fps, this.cpu)
    }
    this.rafId = raf(this.tick)
  }
}
