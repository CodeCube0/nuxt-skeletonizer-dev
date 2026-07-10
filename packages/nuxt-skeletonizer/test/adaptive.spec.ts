import { describe, expect, it } from 'vitest'
import { resolveDecision } from '../src/runtime/engine/pipeline/adaptive'
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

describe('resolveDecision', () => {
  it('stays full + shimmer when adaptive is off', () => {
    const d = resolveDecision({ signals: signals(), microTier: 'static', config: { shimmer: true, adaptive: false } })
    expect(d.animationTier).toBe('full')
    expect(d.shimmer).toBe(true)
    expect(d.reasons).toHaveLength(0)
  })

  it('pins to static under reduced motion even without adaptive', () => {
    const d = resolveDecision({ signals: signals({ reducedMotion: true }), microTier: 'full', config: { shimmer: true, adaptive: false } })
    expect(d.animationTier).toBe('static')
    expect(d.reasons.some(r => r.code === 'degrade:animation')).toBe(true)
  })

  it('follows the microcontroller tier when adaptive is on', () => {
    const d = resolveDecision({ signals: signals({ fps: 20 }), microTier: 'reduced', config: { shimmer: true, adaptive: true } })
    expect(d.animationTier).toBe('reduced')
    expect(d.reasons.some(r => r.code === 'degrade:animation' && r.detail.tier === 'reduced')).toBe(true)
  })

  it('auto-disables the shimmer under heavy CPU pressure (adaptive)', () => {
    const d = resolveDecision({ signals: signals({ cpu: 0.9 }), microTier: 'full', config: { shimmer: true, adaptive: true } })
    expect(d.shimmer).toBe(false)
    expect(d.reasons.some(r => r.code === 'disable:shimmer')).toBe(true)
  })

  it('keeps the shimmer disabled by config without firing a reason', () => {
    const d = resolveDecision({ signals: signals(), microTier: 'full', config: { shimmer: false, adaptive: true } })
    expect(d.shimmer).toBe(false)
    expect(d.reasons.some(r => r.code === 'disable:shimmer')).toBe(false)
  })
})
