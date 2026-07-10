import type { ScannedNode, SkeletonBoneKind, SkeletonRect } from '../../types'
import { ATTR } from '../constants'
import { classify } from './classify'
import { now } from './clock'

/** Text-bearing bone kinds eligible for real per-line measurement. */
const TEXT_KINDS = new Set<SkeletonBoneKind>(['text', 'heading'])

/** Safety valve: degenerate blocks of text (huge articles) fall back to one bone. */
const MAX_TEXT_LINES = 200

/**
 * Layout metadata for a flex/grid container the scan descended into. Captured
 * for fidelity verification and DevTools/telemetry — the SVG output is already
 * pixel-accurate without it, because every descendant bone is drawn at its own
 * real absolute position (the gap and alignment are implicit in those
 * coordinates). This is the explicit record STEP 6 asks the scan layer to keep.
 */
export interface ScannedContainerLayout {
  /** Bounding box relative to the host origin, in CSS px. */
  rect: SkeletonRect
  display: 'flex' | 'grid'
  /** `flex-direction` (flex containers only). */
  direction?: string
  justify: string
  align: string
  /** Row/column gap, in CSS px. */
  gap: { row: number, column: number }
  /** Track count derived from `grid-template-columns`/`-rows` (grid only). */
  columns?: number
  rows?: number
}

/**
 * The Scan Layer.
 *
 * Walks a host subtree (iterative DFS, leaf-stop, container descent) and
 * **measures** every element it would skeletonize into a flat list of
 * {@link ScannedNode}s — each carrying a host-relative bounding box, a semantic
 * kind and a border radius. It is fully non-destructive: it only *reads* the
 * DOM (`getBoundingClientRect`, `getComputedStyle`), never moving, wrapping,
 * mutating or removing a node. The SVG renderer turns the result into a single
 * `<svg>` overlay.
 *
 * Directive handling:
 * - `v-skeleton-ignore` / `v-skeleton-keep` → skipped, no rect (content kept).
 * - `v-skeleton-replace` → one rect of the forced kind, leaf-stop.
 * - `v-skeleton-union`   → bounding boxes of elements sharing a group value are
 *   merged into a single rect; a valueless union is a standalone block.
 * - `v-skeleton-shimmer` → a translucent shimmer rect over the element while its
 *   real content stays visible.
 */
export interface ScannerOptions {
  /** Honour each element's own border-radius (vs. the themed default). */
  respectBorderRadius: boolean
  /** Themed default radius (px) used when `respectBorderRadius` is false. */
  defaultRadius: number
  /** Maximum DOM depth the scan will descend (guards pathological trees). */
  maxDepth: number
  /** Emit verbose diagnostics to the console. */
  debug: boolean
}

export interface ScanOutput {
  /** The measured nodes, in DFS order plus any merged union rects. */
  nodes: ScannedNode[]
  /** Number of elements skipped/ignored during this scan. */
  ignored: number
  /** Wall-clock duration of the scan, in milliseconds. */
  durationMs: number
  /** Flex/grid layout metadata for every container descended into. */
  containers: ScannedContainerLayout[]
}

/** Element children only (skips text/comment nodes). */
function childElements(el: Element): HTMLElement[] {
  const out: HTMLElement[] = []
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 1) out.push(node as HTMLElement)
  }
  return out
}

/** Bounding box of `el` relative to `originRect`. Zeroed when layout is absent. */
function relativeRect(el: HTMLElement, originRect: DOMRect): SkeletonRect {
  const r = el.getBoundingClientRect()
  return {
    x: r.left - originRect.left,
    y: r.top - originRect.top,
    width: r.width,
    height: r.height,
  }
}

/** Parse the first border-radius component as px (0 when unparseable). */
function readRadius(style: CSSStyleDeclaration): number {
  const v = Number.parseFloat(style.borderRadius)
  return Number.isFinite(v) ? v : 0
}

/**
 * Real per-line rects for the text inside `el`, via `Range.getClientRects()`.
 * Each inline run (a wrapped word-fragment) can produce its own `DOMRect`, so
 * rects on the same visual row (close `y`) are unioned into one line rect —
 * that union's width is the real rendered width of the line.
 */
function measureTextLines(el: HTMLElement, originRect: DOMRect): SkeletonRect[] {
  let clientRects: ArrayLike<DOMRect>
  try {
    const range = document.createRange()
    range.selectNodeContents(el)
    clientRects = range.getClientRects()
  }
  catch {
    return []
  }

  const raw: SkeletonRect[] = []
  for (const r of Array.from(clientRects)) {
    if (r.width <= 0 || r.height <= 0) continue
    raw.push({ x: r.left - originRect.left, y: r.top - originRect.top, width: r.width, height: r.height })
  }
  if (raw.length === 0) return []

  raw.sort((a, b) => a.y - b.y)
  const lines: SkeletonRect[] = []
  for (const r of raw) {
    const last = lines[lines.length - 1]
    if (last && Math.abs(r.y - last.y) < Math.max(1, last.height * 0.3)) {
      const x2 = Math.max(last.x + last.width, r.x + r.width)
      last.x = Math.min(last.x, r.x)
      last.width = x2 - last.x
      last.height = Math.max(last.height, r.height)
    }
    else {
      lines.push({ ...r })
    }
  }
  return lines
}

/** Parse a CSS gap shorthand/longhand pair into `{ row, column }` px. */
function readGap(style: CSSStyleDeclaration): { row: number, column: number } {
  const row = Number.parseFloat(style.rowGap || style.gap) || 0
  const column = Number.parseFloat(style.columnGap || style.gap) || 0
  return { row, column }
}

/** Track count from a `grid-template-columns`/`-rows` computed value. */
function countTracks(template: string): number | undefined {
  if (!template || template === 'none') return undefined
  return template.trim().split(/\s+/).length
}

/** Flex/grid layout metadata for a container, or `null` when it is neither. */
function containerLayout(el: HTMLElement, style: CSSStyleDeclaration, originRect: DOMRect): ScannedContainerLayout | null {
  const display = style.display
  const gap = readGap(style)
  if (display === 'grid' || display === 'inline-grid') {
    return {
      rect: relativeRect(el, originRect),
      display: 'grid',
      justify: style.justifyContent,
      align: style.alignItems,
      gap,
      columns: countTracks(style.gridTemplateColumns),
      rows: countTracks(style.gridTemplateRows),
    }
  }
  if (display === 'flex' || display === 'inline-flex') {
    return {
      rect: relativeRect(el, originRect),
      display: 'flex',
      direction: style.flexDirection,
      justify: style.justifyContent,
      align: style.alignItems,
      gap,
    }
  }
  return null
}

/** The smallest rect enclosing all of `rects`. */
function mergeRects(rects: SkeletonRect[]): SkeletonRect {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const r of rects) {
    minX = Math.min(minX, r.x)
    minY = Math.min(minY, r.y)
    maxX = Math.max(maxX, r.x + r.width)
    maxY = Math.max(maxY, r.y + r.height)
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/**
 * Scan a host subtree into a list of measured {@link ScannedNode}s. Pure with
 * respect to the DOM (reads only).
 */
export function scanSubtree(root: HTMLElement, opts: ScannerOptions): ScanOutput {
  const start = now()
  const nodes: ScannedNode[] = []
  const containers: ScannedContainerLayout[] = []
  let ignored = 0
  const originRect = root.getBoundingClientRect()

  // Union: elements sharing a non-empty group value merge into one rect.
  const unionGroups = new Map<string, SkeletonRect[]>()

  const radiusFor = (el: HTMLElement, style: CSSStyleDeclaration): number =>
    opts.respectBorderRadius ? readRadius(style) : opts.defaultRadius

  const stack: Array<{ el: HTMLElement, depth: number }> = []
  for (const child of childElements(root)) stack.push({ el: child, depth: 1 })

  while (stack.length > 0) {
    const { el, depth } = stack.pop()!

    // Union has the highest structural priority: collect, never descend.
    if (el.hasAttribute(ATTR.union)) {
      const group = el.getAttribute(ATTR.union)?.trim()
      const style = getComputedStyle(el)
      const rect = relativeRect(el, originRect)
      if (group) {
        const arr = unionGroups.get(group) ?? []
        arr.push(rect)
        unionGroups.set(group, arr)
      }
      else {
        nodes.push({ el, kind: 'block', rect, radius: radiusFor(el, style), depth })
      }
      continue
    }

    const style = getComputedStyle(el)
    const kind = classify(el, style)

    if (kind === 'skip') {
      ignored++
      continue
    }

    if (kind === 'shimmer') {
      // Translucent shimmer over the element; its real content stays visible.
      nodes.push({ el, kind: 'block', rect: relativeRect(el, originRect), radius: radiusFor(el, style), depth, shimmer: true })
      continue
    }

    if (kind === 'container') {
      if (depth >= opts.maxDepth) {
        // Safety valve: collapse pathologically deep trees into one rect.
        nodes.push({ el, kind: 'block', rect: relativeRect(el, originRect), radius: radiusFor(el, style), depth })
        continue
      }
      const layout = containerLayout(el, style, originRect)
      if (layout) containers.push(layout)
      for (const child of childElements(el)) stack.push({ el: child, depth: depth + 1 })
      continue
    }

    // Text-bearing leaves: prefer real per-line rects over the element's box
    // (padding-inclusive) when the text actually wraps into multiple lines.
    if (TEXT_KINDS.has(kind)) {
      const lines = measureTextLines(el, originRect)
      if (lines.length > 0 && lines.length <= MAX_TEXT_LINES) {
        const radius = radiusFor(el, style)
        for (const lineRect of lines) nodes.push({ el, kind, rect: lineRect, radius, depth })
        continue
      }
    }

    // Leaf bone: measure and do not descend.
    nodes.push({ el, kind, rect: relativeRect(el, originRect), radius: radiusFor(el, style), depth })
  }

  // Emit one merged rect per non-empty union group.
  for (const rects of unionGroups.values()) {
    nodes.push({ el: root, kind: 'block', rect: mergeRects(rects), radius: opts.defaultRadius, depth: 1 })
  }

  const durationMs = now() - start
  if (opts.debug) {
    console.debug(
      `[nuxt-skeletonizer] scanned ${nodes.length} nodes, `
      + `${ignored} ignored in ${durationMs.toFixed(2)}ms`,
    )
  }
  return { nodes, ignored, durationMs, containers }
}

export type { ScannedNode, SkeletonBoneKind }
