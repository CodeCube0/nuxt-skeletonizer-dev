import { describe, expect, it } from 'vitest'
import {
  bucket,
  fnv1a,
  LayoutFingerprintCache,
  layoutFingerprint,
} from '../src/runtime/engine/intelligence/fingerprint'
import type { SvgBlueprint } from '../src/types'

function blueprint(over: Partial<SvgBlueprint> = {}): SvgBlueprint {
  return { svg: '<svg/>', nodeCount: 3, width: 100, height: 50, gradientId: 'sk-shimmer-x', tier: 'full', ...over }
}

describe('fingerprint helpers', () => {
  it('fnv1a is stable and deterministic', () => {
    expect(fnv1a('hello')).toBe(fnv1a('hello'))
    expect(fnv1a('a')).not.toBe(fnv1a('b'))
  })

  it('buckets viewport dimensions so near sizes collide', () => {
    expect(bucket(1024)).toBe(bucket(1030))
    expect(bucket(1024)).not.toBe(bucket(1200))
  })

  it('layoutFingerprint hashes route + viewport + uid', () => {
    const a = layoutFingerprint('/x', { width: 1000, height: 800 }, '1')
    const b = layoutFingerprint('/x', { width: 1000, height: 800 }, '1')
    const c = layoutFingerprint('/y', { width: 1000, height: 800 }, '1')
    expect(a.key).toBe(b.key)
    expect(a.key).not.toBe(c.key)
  })
})

describe('LayoutFingerprintCache', () => {
  it('is disabled (always misses) when mode is false', () => {
    const cache = new LayoutFingerprintCache(false)
    expect(cache.enabled).toBe(false)
    const fp = layoutFingerprint('/x', { width: 800, height: 600 }, '1')
    cache.set(fp, blueprint(), 0)
    expect(cache.get(fp.key)).toBeNull()
  })

  it('misses then hits — letting the engine skip the scan on a hit', () => {
    const cache = new LayoutFingerprintCache('memory')
    const fp = layoutFingerprint('/x', { width: 800, height: 600 }, '1')

    // Cache miss → caller must scan.
    expect(cache.get(fp.key)).toBeNull()
    expect(cache.stats.misses).toBe(1)

    // Store the freshly-built blueprint.
    cache.set(fp, blueprint({ nodeCount: 7 }), 1)

    // Cache hit → blueprint replayed, scan skipped.
    const hit = cache.get(fp.key)
    expect(hit?.nodeCount).toBe(7)
    expect(cache.stats.hits).toBe(1)
  })

  it('invalidates a single entry by key', () => {
    const cache = new LayoutFingerprintCache('memory')
    const fp = layoutFingerprint('/x', { width: 800, height: 600 }, '1')
    cache.set(fp, blueprint(), 0)
    cache.invalidate(fp.key)
    expect(cache.get(fp.key)).toBeNull()
  })

  it('invalidates every entry for a route (route-change eviction)', () => {
    const cache = new LayoutFingerprintCache('memory')
    const a = layoutFingerprint('/a', { width: 800, height: 600 }, '1')
    const b = layoutFingerprint('/a', { width: 800, height: 600 }, '2')
    const c = layoutFingerprint('/b', { width: 800, height: 600 }, '1')
    cache.set(a, blueprint(), 0)
    cache.set(b, blueprint(), 0)
    cache.set(c, blueprint(), 0)

    cache.invalidateRoute('/a')
    expect(cache.get(a.key)).toBeNull()
    expect(cache.get(b.key)).toBeNull()
    expect(cache.get(c.key)).not.toBeNull()
  })

  it('evicts the oldest entry past capacity', () => {
    const cache = new LayoutFingerprintCache('memory', 2)
    const fps = [1, 2, 3].map(i => layoutFingerprint('/x', { width: 800, height: 600 }, String(i)))
    fps.forEach(fp => cache.set(fp, blueprint(), 0))
    // First entry evicted.
    expect(cache.get(fps[0]!.key)).toBeNull()
    expect(cache.get(fps[2]!.key)).not.toBeNull()
  })

  it('clears everything', () => {
    const cache = new LayoutFingerprintCache('memory')
    const fp = layoutFingerprint('/x', { width: 800, height: 600 }, '1')
    cache.set(fp, blueprint(), 0)
    cache.clear()
    expect(cache.get(fp.key)).toBeNull()
  })
})

describe('LayoutFingerprintCache (session mirror)', () => {
  it('mirrors blueprints to sessionStorage and reads them back', () => {
    if (typeof sessionStorage === 'undefined') return
    sessionStorage.clear()
    const write = new LayoutFingerprintCache('session')
    const fp = layoutFingerprint('/s', { width: 800, height: 600 }, '9')
    write.set(fp, blueprint({ nodeCount: 4 }), 0)

    // A fresh cache (cold memory) rehydrates from the session mirror.
    const read = new LayoutFingerprintCache('session')
    const hit = read.get(fp.key)
    expect(hit?.nodeCount).toBe(4)

    read.invalidate(fp.key)
    write.clear()
    expect(new LayoutFingerprintCache('session').get(fp.key)).toBeNull()
  })
})
