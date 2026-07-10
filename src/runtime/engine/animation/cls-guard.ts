import type { SkeletonRect } from '../../../types'

/**
 * CLS Guard — Cumulative Layout Shift prevention.
 *
 * The SVG overlay is injected *over* the host while the real content is hidden
 * but kept in layout (it keeps occupying its box), so the skeleton→content
 * swap shifts nothing. The guard's job is to clamp the overlay's `viewBox` to
 * the exact host bounding box so the SVG can never overflow — or fall short —
 * by even a pixel.
 *
 * It also wraps `PerformanceObserver('layout-shift')` to *measure* the CLS
 * actually accrued during a transition, feeding the telemetry layer so the
 * zero-CLS guarantee is verified, not merely asserted.
 */

/** A `viewBox` clamped to the exact host box, so the overlay never overflows. */
export function clampViewBox(rect: SkeletonRect): string {
  const w = Math.max(0, rect.width)
  const h = Math.max(0, rect.height)
  return `0 0 ${w} ${h}`
}

/**
 * Observe layout shifts for the duration of a transition. Returns a `stop()`
 * that resolves the total CLS score observed. No-ops (resolves 0) where the
 * API is unavailable (SSR, happy-dom, non-Chromium).
 */
export function measureCls(): { stop: () => number } {
  const PO = (globalThis as { PerformanceObserver?: typeof PerformanceObserver }).PerformanceObserver
  if (typeof PO !== 'function') {
    return { stop: () => 0 }
  }
  let total = 0
  let observer: PerformanceObserver | null = null
  try {
    observer = new PO((list) => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { value?: number, hadRecentInput?: boolean }>) {
        if (!entry.hadRecentInput && typeof entry.value === 'number') total += entry.value
      }
    })
    observer.observe({ type: 'layout-shift', buffered: true } as PerformanceObserverInit)
  }
  catch {
    return { stop: () => 0 }
  }
  return {
    stop: () => {
      observer?.disconnect()
      return Math.round(total * 10000) / 10000
    },
  }
}
