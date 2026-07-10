import { describe, expect, it } from 'vitest'
import { TelemetryCollector } from '../src/runtime/engine/telemetry/telemetry'
import { OffThreadCompute, runOnMain } from '../src/runtime/engine/telemetry/offthread'
import { BottleneckTracker } from '../src/runtime/engine/devtools/bottleneck'
import { explainDecision, ExplainLog } from '../src/runtime/engine/devtools/explain'
import type { SkeletonStageTimings } from '../src/types'

const timings = (totalMs: number): SkeletonStageTimings => ({
  scanMs: totalMs / 2,
  renderMs: totalMs / 2,
  totalMs,
})

describe('TelemetryCollector', () => {
  it('records samples, aggregates and computes cache ratio', () => {
    const t = new TelemetryCollector(10)
    t.record({ at: 0, timings: timings(10), fps: 60, cpu: 0, memoryMB: 0, boneCount: 5, strategy: 'dom' })
    t.record({ at: 1, timings: timings(20), fps: 50, cpu: 0.1, memoryMB: 10, boneCount: 8, strategy: 'svg' })
    t.noteCache(true)
    t.noteCache(false)
    const agg = t.aggregate()
    expect(agg.count).toBe(2)
    expect(agg.avgTotalMs).toBe(15)
    expect(agg.maxTotalMs).toBe(20)
    expect(agg.cacheHitRatio).toBe(0.5)
    expect(t.series('fps')).toEqual([60, 50])
    expect(t.series('boneCount')).toEqual([5, 8])
  })

  it('ring-buffers beyond capacity and notifies subscribers', () => {
    const t = new TelemetryCollector(2)
    const seen: number[] = []
    const off = t.subscribe(s => seen.push(s.boneCount))
    for (let i = 0; i < 4; i++) {
      t.record({ at: i, timings: timings(1), fps: 60, cpu: 0, memoryMB: 0, boneCount: i, strategy: 'dom' })
    }
    expect(t.recent().length).toBe(2)
    expect(seen.length).toBe(4)
    off()
    expect(t.aggregate().count).toBe(2)
  })

  it('aggregate is zeroed when empty', () => {
    expect(new TelemetryCollector().aggregate().count).toBe(0)
  })
})

describe('OffThreadCompute', () => {
  it('runOnMain computes fingerprint and analysis', () => {
    expect(typeof runOnMain({ type: 'fingerprint', payload: 'hello' })).toBe('string')
    const a = runOnMain({ type: 'analyze', payload: [1, 2, 3, 4] })
    expect(a).toMatchObject({ count: 4, sum: 10, max: 4 })
  })

  it('classifies page weight', () => {
    expect((runOnMain({ type: 'analyze', payload: Array(5000).fill(1) }) as { pageClass: string }).pageClass).toBe('extreme')
    expect((runOnMain({ type: 'analyze', payload: Array(2000).fill(1) }) as { pageClass: string }).pageClass).toBe('heavy')
    expect((runOnMain({ type: 'analyze', payload: [1] }) as { pageClass: string }).pageClass).toBe('light')
  })

  it('falls back to idle execution when no worker is available', async () => {
    const c = new OffThreadCompute(false)
    const result = await c.run<string>({ type: 'fingerprint', payload: 'abc' })
    expect(result).toBe(runOnMain({ type: 'fingerprint', payload: 'abc' }))
    expect(c.usingWorker).toBe(false)
    c.dispose()
  })
})

describe('BottleneckTracker', () => {
  it('ranks hosts by total cost with running means', () => {
    const b = new BottleneckTracker()
    b.record(1, 'grid', 10, 10, 100)
    b.record(1, 'grid', 20, 20, 120) // running mean → 15/15
    b.record(2, 'form', 1, 1, 5)
    const ranked = b.ranked()
    expect(ranked[0]!.id).toBe(1)
    expect(ranked[0]!.scanMs).toBe(15)
    expect(b.worst()!.id).toBe(1)
    b.forget(1)
    expect(b.worst()!.id).toBe(2)
  })
})

describe('ExplainLog', () => {
  it('is a no-op while disabled', () => {
    const log = new ExplainLog(10, false)
    expect(log.push('x', 'y', 0)).toBeNull()
    expect(log.list().length).toBe(0)
  })

  it('records and ring-buffers when enabled', () => {
    const log = new ExplainLog(2, true)
    log.push('degrade:animation', 'a', 0)
    log.push('disable:shimmer', 'b', 1)
    log.push('cache:hit', 'c', 2)
    expect(log.list().length).toBe(2)
    expect(log.latest()!.code).toBe('cache:hit')
    log.clear()
    expect(log.list().length).toBe(0)
  })

  it('formats decision messages in Italian', () => {
    expect(explainDecision('cache:hit', { nodes: 12 })).toContain('cache')
    expect(explainDecision('degrade:animation', { tier: 'reduced', fps: 24 })).toContain('pulse')
    expect(explainDecision('degrade:animation', { tier: 'static', fps: 18 })).toContain('statico')
    expect(explainDecision('disable:shimmer', { cpu: 0.9 })).toContain('Shimmer')
    expect(explainDecision('unknown:code', { a: 1 })).toContain('unknown:code')
  })
})
