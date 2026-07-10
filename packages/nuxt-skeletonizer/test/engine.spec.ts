import { beforeEach, describe, expect, it } from 'vitest'
import { SkeletonEngine, type HostMeta } from '../src/runtime/engine/pipeline'
import type { SkeletonizerOptions } from '../src/types'
import { makeConfig } from './fixtures'

function host(html = '<div><h2>Title</h2><p>Body</p><button>Go</button></div>'): HTMLElement {
  const el = document.createElement('div')
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

const meta: HostMeta = { id: 1, label: 'test', animation: 'wave', shimmer: true }

function engineWith(over: Partial<SkeletonizerOptions> = {}): SkeletonEngine {
  const cfg = makeConfig(over)
  return new SkeletonEngine(() => cfg)
}

describe('SkeletonEngine', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('scans and injects a single SVG overlay, hiding the content', () => {
    const engine = engineWith()
    const root = host()
    const result = engine.renderHost(root, meta)

    expect(result.bones).toBe(3)
    expect(root.classList.contains('sk-svg-hidden')).toBe(true)
    const overlay = root.querySelector('.sk-overlay')
    expect(overlay).not.toBeNull()
    expect(overlay!.querySelector('svg')).not.toBeNull()
    expect(result.blueprint.svg).toContain('<svg')
    expect(engine.hasOverlay(root)).toBe(true)
  })

  it('tears the overlay down and restores the host on teardown', () => {
    const engine = engineWith()
    const root = host()
    engine.renderHost(root, meta)
    engine.teardownHost(root, meta.id)
    expect(root.querySelector('.sk-overlay')).toBeNull()
    expect(root.classList.contains('sk-svg-hidden')).toBe(false)
    expect(engine.hasOverlay(root)).toBe(false)
  })

  it('re-rendering replaces the overlay (idempotent)', () => {
    const engine = engineWith()
    const root = host()
    engine.renderHost(root, meta)
    engine.renderHost(root, meta)
    expect(root.querySelectorAll('.sk-overlay')).toHaveLength(1)
  })

  it('replays from cache on the second render (scan skipped)', () => {
    const engine = engineWith({ layoutCache: 'memory' })
    const root = host()
    const first = engine.renderHost(root, meta)
    expect(first.fromCache).toBe(false)
    const second = engine.renderHost(root, meta)
    expect(second.fromCache).toBe(true)
    expect(second.nodes).toHaveLength(0) // scan skipped on a hit
    expect(engine.cache.stats.hits).toBe(1)
  })

  it('invalidateHost forces a fresh scan on the next render', () => {
    const engine = engineWith({ layoutCache: 'memory' })
    const root = host()
    engine.renderHost(root, meta)
    engine.invalidateHost(meta.id)
    const after = engine.renderHost(root, meta)
    expect(after.fromCache).toBe(false)
  })

  it('records telemetry only when enabled', () => {
    const off = engineWith()
    off.renderHost(host(), meta)
    expect(off.telemetry.aggregate().count).toBe(0)

    const on = engineWith({ telemetry: true })
    on.renderHost(host(), meta)
    expect(on.telemetry.aggregate().count).toBe(1)
  })

  it('snapshot reports the svg render mode and never-degraded by default', () => {
    const engine = engineWith()
    engine.renderHost(host(), meta)
    const snap = engine.snapshot(3)
    expect(snap.animationTier).toBe('full')
    expect(snap.degraded).toBe(false)
    expect(typeof snap.score).toBe('number')
  })

  it('setLoading only spins the FPS sampler when adaptive/telemetry is on', () => {
    const inert = engineWith()
    inert.setLoading(true)
    expect(inert.fps.active).toBe(false)
    inert.setLoading(false)

    const live = engineWith({ telemetry: true })
    live.setLoading(true)
    expect(live.fps.active).toBe(true)
    live.dispose()
  })
})
