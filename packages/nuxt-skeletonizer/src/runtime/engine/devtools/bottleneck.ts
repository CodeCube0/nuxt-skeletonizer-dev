/**
 * Overlay Debugger & Bottleneck Detection (Step 3 §7).
 *
 * Tracks per-host scan/render cost so DevTools can rank the components that are
 * slowest to skeletonize, and can paint a debug overlay mapping bones on the
 * page. Cost is accumulated with a running mean so a single janky frame doesn't
 * dominate the ranking.
 */
export interface HostCost {
  id: number
  label: string
  /** Running-mean scan time (ms). */
  scanMs: number
  /** Running-mean render time (ms). */
  renderMs: number
  /** Bones in the latest plan. */
  bones: number
  /** Number of samples folded into the means. */
  samples: number
}

export class BottleneckTracker {
  private hosts = new Map<number, HostCost>()

  /** Fold a sample for a host into its running means. */
  record(id: number, label: string, scanMs: number, renderMs: number, bones: number): void {
    const prev = this.hosts.get(id)
    if (!prev) {
      this.hosts.set(id, { id, label, scanMs, renderMs, bones, samples: 1 })
      return
    }
    const n = prev.samples + 1
    prev.scanMs = prev.scanMs + (scanMs - prev.scanMs) / n
    prev.renderMs = prev.renderMs + (renderMs - prev.renderMs) / n
    prev.bones = bones
    prev.label = label
    prev.samples = n
  }

  /** Drop a host that has unmounted. */
  forget(id: number): void {
    this.hosts.delete(id)
  }

  /** Hosts ranked by total (scan+render) cost, slowest first. */
  ranked(): HostCost[] {
    return Array.from(this.hosts.values())
      .sort((a, b) => (b.scanMs + b.renderMs) - (a.scanMs + a.renderMs))
  }

  /** The single worst offender, if any. */
  worst(): HostCost | null {
    return this.ranked()[0] ?? null
  }

  clear(): void {
    this.hosts.clear()
  }
}
