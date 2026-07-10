import { describe, expect, it } from 'vitest'
import { buildBlueprint, gradientId, round, shapeFor, visualMode } from '../src/runtime/engine/render/svg'
import type { ScannedNode, SkeletonRect, SvgRendererOptions } from '../src/types'

function node(over: Partial<ScannedNode> = {}): ScannedNode {
  return {
    el: document.createElement('div'),
    kind: 'text',
    rect: { x: 0, y: 0, width: 100, height: 12 },
    radius: 4,
    depth: 1,
    ...over,
  }
}

const container: SkeletonRect = { x: 0, y: 0, width: 320, height: 200 }

function opts(over: Partial<SvgRendererOptions> = {}): SvgRendererOptions {
  return {
    precision: 1,
    sharedGradient: true,
    shimmer: true,
    animation: 'wave',
    tier: 'full',
    uid: 'abc',
    respectBorderRadius: true,
    durationMs: 1200,
    ...over,
  }
}

describe('buildBlueprint', () => {
  it('emits one <rect> per scanned node', () => {
    const bp = buildBlueprint([node(), node(), node()], container, opts())
    expect(bp.nodeCount).toBe(3)
    expect(bp.svg.match(/<rect/g)).toHaveLength(3)
    expect(bp.width).toBe(320)
    expect(bp.height).toBe(200)
  })

  it('clamps the viewBox to the host bounding box (CLS guard)', () => {
    const bp = buildBlueprint([node()], { x: 0, y: 0, width: 640, height: 480 }, opts())
    expect(bp.svg).toContain('viewBox="0 0 640 480"')
    expect(bp.svg).toContain('preserveAspectRatio="none"')
  })

  it('honours the scanned border radius as rx/ry', () => {
    const bp = buildBlueprint([node({ radius: 9 })], container, opts())
    expect(bp.svg).toContain('rx="9"')
    expect(bp.svg).toContain('ry="9"')
  })

  it('renders avatars as <circle>', () => {
    const bp = buildBlueprint(
      [node({ kind: 'avatar', rect: { x: 0, y: 0, width: 40, height: 40 } })],
      container,
      opts(),
    )
    expect(bp.svg).toContain('<circle')
    expect(bp.svg).toContain('r="20"')
  })

  it('includes a <linearGradient> + <animateTransform> when the shimmer sweeps', () => {
    const bp = buildBlueprint([node()], container, opts({ shimmer: true, animation: 'wave', tier: 'full' }))
    expect(bp.svg).toContain('<linearGradient')
    expect(bp.svg).toContain('<animateTransform')
    expect(bp.svg).toContain('fill="url(#sk-shimmer-abc)"')
  })

  it('omits the gradient when shimmer is disabled (static flat fill)', () => {
    const bp = buildBlueprint([node()], container, opts({ shimmer: false }))
    expect(bp.svg).not.toContain('<linearGradient')
    expect(bp.svg).not.toContain('<animateTransform')
    expect(bp.svg).toContain('fill="var(--sk-bg)"')
  })

  it('pulse tier keeps the gradient but drops the sweep animation', () => {
    const bp = buildBlueprint([node()], container, opts({ tier: 'reduced' }))
    expect(bp.svg).toContain('<linearGradient')
    expect(bp.svg).not.toContain('<animateTransform')
    expect(bp.svg).toContain('sk-svg--pulse')
  })

  it('namespaces the gradient id per instance to avoid collisions', () => {
    const a = buildBlueprint([node()], container, opts({ uid: 'one' }))
    const b = buildBlueprint([node()], container, opts({ uid: 'two' }))
    expect(a.gradientId).toBe('sk-shimmer-one')
    expect(b.gradientId).toBe('sk-shimmer-two')
    expect(a.svg).toContain('id="sk-shimmer-one"')
    expect(b.svg).toContain('id="sk-shimmer-two"')
  })

  it('supports one gradient per shape when sharedGradient is false', () => {
    const bp = buildBlueprint([node(), node()], container, opts({ sharedGradient: false }))
    expect(bp.svg.match(/<linearGradient/g)).toHaveLength(2)
    expect(bp.svg).toContain('id="sk-shimmer-abc-0"')
    expect(bp.svg).toContain('id="sk-shimmer-abc-1"')
  })

  it('preserves a non-square image aspect ratio exactly (never forced into a square)', () => {
    const bp = buildBlueprint(
      [node({ kind: 'image', rect: { x: 0, y: 0, width: 312, height: 48 } })],
      container,
      opts(),
    )
    expect(bp.svg).toContain('width="312"')
    expect(bp.svg).toContain('height="48"')
    expect(bp.svg).not.toMatch(/width="312"[^>]*height="312"/)
  })

  it('rounds coordinates to the requested precision', () => {
    const bp = buildBlueprint(
      [node({ rect: { x: 1.23456, y: 0, width: 10.987, height: 12 } })],
      container,
      opts({ precision: 1 }),
    )
    expect(bp.svg).toContain('x="1.2"')
    expect(bp.svg).toContain('width="11"')
  })
})

describe('renderer helpers', () => {
  it('round honours precision', () => {
    expect(round(1.2345, 2)).toBe(1.23)
    expect(round(1.9, 0)).toBe(2)
  })

  it('gradientId namespaces with an optional index', () => {
    expect(gradientId('x')).toBe('sk-shimmer-x')
    expect(gradientId('x', 3)).toBe('sk-shimmer-x-3')
  })

  it('visualMode folds animation + shimmer + tier', () => {
    expect(visualMode(opts({ shimmer: false }))).toBe('none')
    expect(visualMode(opts({ tier: 'static' }))).toBe('none')
    expect(visualMode(opts({ animation: 'none' }))).toBe('none')
    expect(visualMode(opts({ animation: 'pulse' }))).toBe('pulse')
    expect(visualMode(opts({ tier: 'reduced' }))).toBe('pulse')
    expect(visualMode(opts({ animation: 'wave', tier: 'full' }))).toBe('sweep')
  })

  it('shapeFor draws a shimmer node with reduced opacity', () => {
    const s = shapeFor(node({ shimmer: true }), 'url(#g)', 1)
    expect(s).toContain('opacity="0.45"')
  })
})
