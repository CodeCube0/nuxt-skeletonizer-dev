import { describe, expect, it, vi } from 'vitest'
import { DebouncedObserver } from '../src/runtime/engine/observer'

describe('DebouncedObserver', () => {
  it('coalesces bursts of mutations into a single debounced callback', async () => {
    vi.useFakeTimers()
    const cb = vi.fn()
    const obs = new DebouncedObserver(cb, 50)
    const root = document.createElement('div')
    document.body.appendChild(root)
    obs.observe(root)

    // Several rapid mutations.
    root.appendChild(document.createElement('span'))
    root.appendChild(document.createElement('span'))
    root.appendChild(document.createElement('span'))

    // MutationObserver callbacks are microtask-scheduled; flush them.
    await Promise.resolve()
    vi.advanceTimersByTime(60)

    expect(cb).toHaveBeenCalledTimes(1)
    obs.disconnect()
    vi.useRealTimers()
  })

  it('stops firing after disconnect', async () => {
    vi.useFakeTimers()
    const cb = vi.fn()
    const obs = new DebouncedObserver(cb, 10)
    const root = document.createElement('div')
    document.body.appendChild(root)
    obs.observe(root)
    obs.disconnect()

    root.appendChild(document.createElement('span'))
    await Promise.resolve()
    vi.advanceTimersByTime(50)

    expect(cb).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('does not throw when pausing or disconnecting before observing', () => {
    const obs = new DebouncedObserver(() => {}, 10)
    expect(() => obs.pause()).not.toThrow()
    expect(() => obs.disconnect()).not.toThrow()
  })
})
