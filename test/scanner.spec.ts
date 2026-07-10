import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scanSubtree, type ScannerOptions } from '../src/runtime/engine/scanner'

function host(html: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

/** A minimal fake `DOMRect` (happy-dom has no real layout engine). */
function fakeRect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x, y, width, height, top: y, left: x, right: x + width, bottom: y + height,
    toJSON: () => ({}),
  } as DOMRect
}

const opts: ScannerOptions = { respectBorderRadius: true, defaultRadius: 6, maxDepth: 64, debug: false }

describe('scanSubtree', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('measures leaf nodes and keeps containers as descend points', () => {
    const root = host(`
      <div class="card">
        <img src="/a.png">
        <h2>Title</h2>
        <p>Body text goes here</p>
        <button>Action</button>
      </div>
    `)
    const { nodes } = scanSubtree(root, opts)
    // 4 leaves become scanned nodes; the wrapping .card stays a container.
    expect(nodes).toHaveLength(4)
    const kinds = nodes.map(n => n.kind).sort()
    expect(kinds).toEqual(['button', 'heading', 'image', 'text'])
    // Source elements are never mutated.
    expect(root.querySelector('img')!.getAttribute('src')).toBe('/a.png')
    expect(root.querySelector('.card')!.classList.length).toBe(1)
  })

  it('produces the same result across re-scans (pure read)', () => {
    const root = host('<div><p>one</p><p>two</p></div>')
    expect(scanSubtree(root, opts).nodes).toHaveLength(2)
    expect(scanSubtree(root, opts).nodes).toHaveLength(2)
  })

  it('skips ignored subtrees and counts them', () => {
    const root = host(`
      <div>
        <p>visible</p>
        <div data-skeleton-ignore><p>hidden from engine</p></div>
      </div>
    `)
    const { nodes, ignored } = scanSubtree(root, opts)
    expect(nodes).toHaveLength(1)
    expect(ignored).toBeGreaterThanOrEqual(1)
  })

  it('collapses a valueless union into a single node without descending', () => {
    const root = host('<div data-skeleton-union><span>a</span><span>b</span></div>')
    const { nodes } = scanSubtree(root, opts)
    expect(nodes).toHaveLength(1)
    expect(nodes[0]!.kind).toBe('block')
  })

  it('merges the bounding boxes of a named union group into one node', () => {
    const root = host(`
      <div>
        <span data-skeleton-union="g1">a</span>
        <span data-skeleton-union="g1">b</span>
        <span data-skeleton-union="g2">c</span>
        <p>standalone</p>
      </div>
    `)
    const { nodes } = scanSubtree(root, opts)
    // group g1 → 1 node, group g2 → 1 node, the <p> → 1 node = 3 total.
    expect(nodes).toHaveLength(3)
  })

  it('honours maxDepth by collapsing deep trees', () => {
    const root = host('<div><div><div><p>deep</p></div></div></div>')
    const { nodes } = scanSubtree(root, { ...opts, maxDepth: 2 })
    expect(nodes.length).toBeGreaterThanOrEqual(1)
  })

  it('flags shimmer-marked nodes as translucent overlays', () => {
    const root = host('<div><div data-skeleton-shimmer>live</div></div>')
    const { nodes } = scanSubtree(root, opts)
    expect(nodes).toHaveLength(1)
    expect(nodes[0]!.shimmer).toBe(true)
  })

  it('applies the themed default radius when respectBorderRadius is off', () => {
    const root = host('<div><p>x</p></div>')
    const { nodes } = scanSubtree(root, { ...opts, respectBorderRadius: false, defaultRadius: 12 })
    expect(nodes[0]!.radius).toBe(12)
  })

  it('preserves the real width/height of an image element exactly (no square deformation)', () => {
    const root = host('<div><img src="/a.png"></div>')
    root.getBoundingClientRect = () => fakeRect(0, 0, 400, 400)
    root.querySelector('img')!.getBoundingClientRect = () => fakeRect(0, 0, 312, 48)
    const { nodes } = scanSubtree(root, opts)
    expect(nodes).toHaveLength(1)
    expect(nodes[0]!.kind).toBe('image')
    expect(nodes[0]!.rect.width).toBe(312)
    expect(nodes[0]!.rect.height).toBe(48)
  })

  describe('text line fidelity', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('emits one bone per real detected line, with the real measured width of each line', () => {
      const root = host('<div><p>a wrapped paragraph</p></div>')
      root.getBoundingClientRect = () => fakeRect(0, 0, 400, 200)

      // Three visual lines: distinct widths, distinct rows — this is what a
      // real browser's Range.getClientRects() returns for wrapped text.
      vi.spyOn(Range.prototype, 'getClientRects').mockReturnValue([
        fakeRect(0, 0, 320, 16),
        fakeRect(0, 20, 287, 16),
        fakeRect(0, 40, 164, 16),
      ] as unknown as DOMRectList)

      const { nodes } = scanSubtree(root, opts)
      expect(nodes).toHaveLength(3)
      expect(nodes.every(n => n.kind === 'text')).toBe(true)
      expect(nodes.map(n => n.rect.width)).toEqual([320, 287, 164])
      // Real pixel widths, never an artificial 100%/90%/75% ladder.
      expect(nodes.map(n => n.rect.width)).not.toEqual([400, 360, 300])
    })

    it('unions same-row rect fragments (nested inline markup) into one line width', () => {
      const root = host('<div><p><b>bold</b> plain</p></div>')
      root.getBoundingClientRect = () => fakeRect(0, 0, 400, 200)

      // Two inline runs on the same visual row: <b>bold</b> then " plain".
      vi.spyOn(Range.prototype, 'getClientRects').mockReturnValue([
        fakeRect(0, 0, 40, 16),
        fakeRect(40, 1, 60, 16),
      ] as unknown as DOMRectList)

      const { nodes } = scanSubtree(root, opts)
      expect(nodes).toHaveLength(1)
      expect(nodes[0]!.rect.width).toBe(100)
    })

    it('falls back to the element bounding box when no real line rects are available', () => {
      // happy-dom has no text layout engine: Range.getClientRects() returns [].
      const root = host('<div><p>x</p></div>')
      root.getBoundingClientRect = () => fakeRect(0, 0, 400, 200)
      root.querySelector('p')!.getBoundingClientRect = () => fakeRect(4, 4, 120, 18)

      const { nodes } = scanSubtree(root, opts)
      expect(nodes).toHaveLength(1)
      expect(nodes[0]!.rect).toEqual({ x: 4, y: 4, width: 120, height: 18 })
    })
  })

  describe('flex/grid container fidelity', () => {
    it('captures grid layout metadata (columns, gap, alignment) without collapsing children into a list', () => {
      const root = host(`
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; justify-content:center; align-items:end;">
          <div>a</div><div>b</div><div>c</div>
        </div>
      `)
      const { nodes, containers } = scanSubtree(root, opts)
      // Children are still individually measured — the grid is not flattened.
      expect(nodes).toHaveLength(3)
      expect(containers).toHaveLength(1)
      expect(containers[0]).toMatchObject({
        display: 'grid',
        columns: 3,
        gap: { row: 8, column: 8 },
        justify: 'center',
        align: 'end',
      })
    })

    it('captures flex layout metadata (direction, gap)', () => {
      const root = host(`
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div>a</div><div>b</div>
        </div>
      `)
      const { containers } = scanSubtree(root, opts)
      expect(containers).toHaveLength(1)
      expect(containers[0]).toMatchObject({
        display: 'flex',
        direction: 'column',
        gap: { row: 12, column: 12 },
      })
    })

    it('reports no container metadata for plain block containers', () => {
      const root = host('<div><div>a</div></div>')
      const { containers } = scanSubtree(root, opts)
      expect(containers).toHaveLength(0)
    })
  })
})
