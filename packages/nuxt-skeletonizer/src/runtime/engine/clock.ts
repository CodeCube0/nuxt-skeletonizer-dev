/**
 * Monotonic clock helpers shared across the engine. They degrade gracefully
 * when `performance`/`requestAnimationFrame` are unavailable (SSR, tests).
 */

/** High-resolution monotonic timestamp in ms (0 when `performance` is absent). */
export function now(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : 0
}

/** `requestAnimationFrame` with a `setTimeout` fallback. Returns a cancel id. */
export function raf(cb: (t: number) => void): number {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(cb)
  return setTimeout(() => cb(now()), 16) as unknown as number
}

/** Cancel an id returned by {@link raf}. */
export function cancelRaf(id: number): void {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id)
  else clearTimeout(id)
}

/** `requestIdleCallback` with a `setTimeout` fallback (TAR: off-main-thread). */
export function idle(cb: () => void, timeout = 50): number {
  const ric = (globalThis as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback
  if (typeof ric === 'function') return ric(cb, { timeout })
  return setTimeout(cb, 1) as unknown as number
}

/** Cancel an id returned by {@link idle}. */
export function cancelIdle(id: number): void {
  const cic = (globalThis as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback
  if (typeof cic === 'function') cic(id)
  else clearTimeout(id)
}
