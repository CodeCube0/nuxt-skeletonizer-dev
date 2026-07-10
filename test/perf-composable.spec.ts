import { afterEach, describe, expect, it } from 'vitest'
import { useSkeletonPerformance } from '../src/runtime/composables/useSkeletonPerformance'
import { createSkeletonizerStore, setActiveStore } from '../src/runtime/state'
import { makeConfig } from './fixtures'

function host(): HTMLElement {
  const el = document.createElement('div')
  el.innerHTML = '<div><h2>T</h2><p>B</p></div>'
  document.body.appendChild(el)
  return el
}

describe('useSkeletonPerformance', () => {
  afterEach(() => setActiveStore(null))

  it('throws before the plugin initialises', () => {
    setActiveStore(null)
    expect(() => useSkeletonPerformance()).toThrowError(/plugin/i)
  })

  it('exposes telemetry, explanations, bottlenecks and the blueprint', () => {
    const store = createSkeletonizerStore(makeConfig({ telemetry: true, explain: true, layoutCache: 'memory' }))
    setActiveStore(store)
    const perf = useSkeletonPerformance()

    // Drive a render so telemetry/blueprint are populated.
    store.engine.renderHost(host(), { id: 1, label: 'x', animation: 'wave', shimmer: true })

    expect(perf.stats.renderMode).toBe('svg')
    expect(perf.telemetry().count).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(perf.series('fps'))).toBe(true)
    expect(Array.isArray(perf.explanations())).toBe(true)
    expect(Array.isArray(perf.bottlenecks())).toBe(true)
    expect(perf.cacheHitRatio.value).toBeGreaterThanOrEqual(0)
    expect(perf.blueprint()?.svg).toContain('<svg')
    expect(perf.engine).toBe(store.engine)
    // lastExplanation may be null or an entry — both are valid shapes.
    expect(perf.lastExplanation.value === null || typeof perf.lastExplanation.value.message === 'string').toBe(true)
  })

  it('computes a cache hit ratio once hits accrue', () => {
    const store = createSkeletonizerStore(makeConfig({ layoutCache: 'memory' }))
    setActiveStore(store)
    const perf = useSkeletonPerformance()
    const h = host()
    store.engine.renderHost(h, { id: 1, label: 'x', animation: 'wave', shimmer: true })
    store.engine.renderHost(h, { id: 1, label: 'x', animation: 'wave', shimmer: true })
    store._recompute()
    expect(perf.cacheHitRatio.value).toBeGreaterThan(0)
  })
})
