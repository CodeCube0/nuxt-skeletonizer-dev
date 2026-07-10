import { describe, expect, it } from 'vitest'
import { AnimationMicrocontroller, tierToAnimation } from '../src/runtime/engine/animation/microcontroller'
import { clampViewBox, measureCls } from '../src/runtime/engine/animation/cls-guard'
import type { SkeletonRuntimeSignals } from '../src/types'

function signals(over: Partial<SkeletonRuntimeSignals> = {}): SkeletonRuntimeSignals {
  return {
    fps: 60,
    cpu: 0,
    boneCount: 0,
    memoryMB: 0,
    score: 100,
    loading: true,
    cores: 8,
    reducedMotion: false,
    ...over,
  }
}

describe('AnimationMicrocontroller', () => {
  it('starts at the full tier', () => {
    const m = new AnimationMicrocontroller({ minFps: 45 })
    expect(m.tier).toBe('full')
  })

  it('pins to static under reduced motion', () => {
    const m = new AnimationMicrocontroller({ minFps: 45 })
    expect(m.update(signals({ reducedMotion: true }), 0)).toBe('static')
  })

  it('degrades on low fps and respects dwell time', () => {
    const m = new AnimationMicrocontroller({ minFps: 45, dwellMs: 100 })
    expect(m.update(signals({ fps: 20 }), 0)).toBe('reduced')
    // Within dwell window — no further change.
    expect(m.update(signals({ fps: 10 }), 50)).toBe('reduced')
    // After dwell — drops again.
    expect(m.update(signals({ fps: 10 }), 200)).toBe('static')
  })

  it('recovers after sustained healthy frames', () => {
    const m = new AnimationMicrocontroller({ minFps: 45, dwellMs: 0 })
    m.update(signals({ fps: 20 }), 0) // reduced
    const recovered = m.update(signals({ fps: 60, cpu: 0 }), 10)
    expect(recovered).toBe('full')
  })

  it('can be forced to a tier', () => {
    const m = new AnimationMicrocontroller({ minFps: 45 })
    m.force('static', 0)
    expect(m.tier).toBe('static')
  })

  it('maps tiers to animation presets', () => {
    expect(tierToAnimation('full', 'wave')).toBe('wave')
    expect(tierToAnimation('reduced', 'wave')).toBe('pulse')
    expect(tierToAnimation('static', 'wave')).toBe('none')
  })
})

describe('CLS guard', () => {
  it('clamps the viewBox to the exact host box', () => {
    expect(clampViewBox({ x: 0, y: 0, width: 320, height: 200 })).toBe('0 0 320 200')
    // Negative dimensions are floored to zero.
    expect(clampViewBox({ x: 0, y: 0, width: -5, height: 10 })).toBe('0 0 0 10')
  })

  it('measureCls returns a stopper that yields a number', () => {
    const m = measureCls()
    expect(typeof m.stop()).toBe('number')
  })
})
