/**
 * A debounced MutationObserver. Coalesces bursts of DOM changes (typical when
 * a framework patches a large subtree) into a single callback so the engine
 * re-scans at most once per `debounce` window.
 */
export class DebouncedObserver {
  private observer: MutationObserver | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly debounce: number
  private readonly callback: () => void

  constructor(callback: () => void, debounce = 50) {
    this.callback = callback
    this.debounce = debounce
  }

  /** Start observing a root element for child/subtree/attribute changes. */
  observe(root: Element): void {
    if (typeof MutationObserver === 'undefined') return
    this.disconnect()
    this.observer = new MutationObserver(() => this.schedule())
    this.observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    })
  }

  /** Temporarily ignore mutations while we mutate the DOM ourselves. */
  pause(): void {
    this.observer?.takeRecords()
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      this.callback()
    }, this.debounce)
  }

  /** Stop observing and cancel any pending callback. */
  disconnect(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.observer?.disconnect()
    this.observer = null
  }
}
