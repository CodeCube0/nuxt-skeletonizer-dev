import { describe, expect, it } from 'vitest'
import { cancelIdle, cancelRaf, idle, now, raf } from '../src/runtime/engine/clock'
import { FpsSampler } from '../src/runtime/engine/perf/fps'

describe('clock', () => {
  it('now() returns a number', () => {
    expect(typeof now()).toBe('number')
  })

  it('raf schedules its callback and can be cancelled', async () => {
    await new Promise<void>((resolve) => {
      raf(() => resolve())
    })
    expect(() => cancelRaf(raf(() => {}))).not.toThrow()
  })

  it('idle schedules its callback and can be cancelled', async () => {
    await new Promise<void>((resolve) => {
      idle(() => resolve())
    })
    expect(() => cancelIdle(idle(() => {}))).not.toThrow()
  })
})

describe('FpsSampler', () => {
  it('reports neutral values when idle', () => {
    const s = new FpsSampler()
    expect(s.fps).toBe(60)
    expect(s.cpu).toBe(0)
    expect(s.active).toBe(false)
  })

  it('start/stop toggles the sampling loop', () => {
    const s = new FpsSampler()
    s.start()
    s.stop()
    expect(s.active).toBe(false)
  })
})
