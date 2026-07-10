import { fnv1a } from '../intelligence/fingerprint'
import { idle } from '../clock'

/**
 * Off-Threading (Step 3 §6 TAR).
 *
 * Heavy compute — fingerprint hashing over huge node lists, "Huge Pages"
 * structural analysis, telemetry roll-ups — must never block the main thread.
 * This module delegates such work to a dedicated Web Worker created from an
 * inline Blob (no separate asset to ship). When workers are unavailable (SSR,
 * tests, locked-down CSP), it transparently falls back to `requestIdleCallback`
 * so the work is still fragmented off the critical path.
 */
export type OffThreadTask
  = | { type: 'fingerprint', payload: string }
    | { type: 'analyze', payload: number[] }

export interface AnalyzeResult {
  count: number
  sum: number
  mean: number
  max: number
  /** Estimated cost class for a "huge page": 'light' | 'heavy' | 'extreme'. */
  pageClass: 'light' | 'heavy' | 'extreme'
}

// The worker body, stringified. Mirrors the main-thread fallbacks below so the
// result is identical regardless of where it runs.
const WORKER_SOURCE = `
self.onmessage = (e) => {
  const { id, task } = e.data
  let result
  if (task.type === 'fingerprint') {
    let h = 0x811c9dc5
    const s = task.payload
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
    result = (h >>> 0).toString(36)
  } else if (task.type === 'analyze') {
    const arr = task.payload
    let sum = 0, max = 0
    for (const n of arr) { sum += n; if (n > max) max = n }
    const count = arr.length
    const mean = count ? sum / count : 0
    const pageClass = count > 4000 ? 'extreme' : count > 1500 ? 'heavy' : 'light'
    result = { count, sum, mean, max, pageClass }
  }
  self.postMessage({ id, result })
}
`

export class OffThreadCompute {
  private worker: Worker | null = null
  private seq = 0
  private pending = new Map<number, (value: unknown) => void>()
  private workerOk = false

  constructor(private preferWorker = true) {}

  /** Lazily create the worker on first use. */
  private ensureWorker(): boolean {
    if (this.worker) return this.workerOk
    if (!this.preferWorker) return false
    const W = (globalThis as { Worker?: typeof Worker }).Worker
    const URLImpl = (globalThis as { URL?: typeof URL }).URL
    const BlobImpl = (globalThis as { Blob?: typeof Blob }).Blob
    if (typeof W !== 'function' || !URLImpl?.createObjectURL || typeof BlobImpl !== 'function') {
      this.workerOk = false
      return false
    }
    try {
      const url = URLImpl.createObjectURL(new BlobImpl([WORKER_SOURCE], { type: 'text/javascript' }))
      this.worker = new W(url)
      this.worker.onmessage = (e: MessageEvent) => {
        const { id, result } = e.data as { id: number, result: unknown }
        const resolve = this.pending.get(id)
        if (resolve) {
          this.pending.delete(id)
          resolve(result)
        }
      }
      this.workerOk = true
    }
    catch {
      this.workerOk = false
    }
    return this.workerOk
  }

  /** Run a task off the main thread (worker → idle fallback). */
  run<T = unknown>(task: OffThreadTask): Promise<T> {
    if (this.ensureWorker() && this.worker) {
      const id = ++this.seq
      return new Promise<T>((resolve) => {
        this.pending.set(id, resolve as (v: unknown) => void)
        this.worker!.postMessage({ id, task })
      })
    }
    // Fallback: compute on the main thread but deferred to idle time.
    return new Promise<T>((resolve) => {
      idle(() => resolve(runOnMain(task) as T))
    })
  }

  /** Whether a real worker is backing this instance. */
  get usingWorker(): boolean {
    return this.workerOk
  }

  dispose(): void {
    this.worker?.terminate()
    this.worker = null
    this.pending.clear()
  }
}

/** The synchronous main-thread implementation, shared as the idle fallback. */
export function runOnMain(task: OffThreadTask): string | AnalyzeResult {
  if (task.type === 'fingerprint') return fnv1a(task.payload)
  const arr = task.payload
  let sum = 0
  let max = 0
  for (const n of arr) {
    sum += n
    if (n > max) max = n
  }
  const count = arr.length
  const mean = count ? sum / count : 0
  const pageClass: AnalyzeResult['pageClass'] = count > 4000 ? 'extreme' : count > 1500 ? 'heavy' : 'light'
  return { count, sum, mean, max, pageClass }
}
