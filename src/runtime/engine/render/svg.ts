import type { ScannedNode, SkeletonRect, SvgBlueprint, SvgRendererOptions } from '../../../types'

/**
 * The SVG Renderer — the single, only rendering backend.
 *
 * Maps a list of measured {@link ScannedNode}s to one `<svg>` overlay: each
 * node becomes a `<rect>` (or a `<circle>` for avatars), filled by a shared,
 * namespaced `<linearGradient>` whose `<animateTransform>` drives the shimmer
 * sweep for every shape at once. A single `<svg>` replaces what used to be
 * hundreds of individual skeleton DOM nodes, the CSS engine never thrashes
 * during render (no per-bone class/animation work), and the markup is fully
 * SSR-safe — it serializes to a string on the server and hydrates without
 * mismatch on the client.
 *
 * The renderer is pure TypeScript: no DOM APIs, no external dependency. It
 * emits a string so the same code path serves SSR and client.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

/** The visual treatment a render resolves to. */
export type SvgVisualMode = 'sweep' | 'pulse' | 'none'

/** The namespaced gradient id for an instance, e.g. `sk-shimmer-a1`. */
export function gradientId(uid: string, index?: number): string {
  return index === undefined ? `sk-shimmer-${uid}` : `sk-shimmer-${uid}-${index}`
}

/**
 * Fold the resolved animation preset + shimmer flag into a concrete visual:
 * sweep-style presets animate the gradient, `pulse`/`fade` breathe the opacity,
 * everything else (or shimmer off) is a static fill.
 */
export function visualMode(opts: SvgRendererOptions): SvgVisualMode {
  if (!opts.shimmer || opts.tier === 'static') return 'none'
  const a = opts.animation
  if (a === 'none') return 'none'
  if (a === 'pulse' || a === 'fade' || opts.tier === 'reduced') return 'pulse'
  return 'sweep'
}

/** Round a coordinate to `precision` decimal places (kills sub-pixel noise). */
export function round(value: number, precision: number): number {
  const f = 10 ** Math.max(0, precision)
  return Math.round(value * f) / f
}

/** Clamp a dimension to a non-negative, rounded value. */
function dim(value: number, precision: number): number {
  return round(Math.max(0, value), precision)
}

/**
 * A single `<linearGradient>` definition. Includes the animated sweep only in
 * `sweep` mode; otherwise it is a static gradient (the pulse/static treatment is
 * applied to the whole `<svg>` via a CSS class).
 */
function gradientDef(id: string, opts: SvgRendererOptions, mode: SvgVisualMode): string {
  const dur = `${Math.max(0, opts.durationMs) / 1000}s`
  const animate = mode === 'sweep'
    ? `<animateTransform attributeName="gradientTransform" type="translate" from="-1 0" to="1 0" dur="${dur}" repeatCount="indefinite"/>`
    : ''
  return (
    `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">`
    + `<stop offset="0%" stop-color="var(--sk-bg)"/>`
    + `<stop offset="50%" stop-color="var(--sk-hl)"/>`
    + `<stop offset="100%" stop-color="var(--sk-bg)"/>`
    + animate
    + `</linearGradient>`
  )
}

/** Effective fill: gradient for sweep/pulse, flat base color when static. */
function fillFor(id: string, mode: SvgVisualMode): string {
  return mode === 'none' ? 'var(--sk-bg)' : `url(#${id})`
}

/** The shape (rect/circle) for one scanned node. */
export function shapeFor(node: ScannedNode, fill: string, precision: number): string {
  const { rect } = node
  const w = dim(rect.width, precision)
  const h = dim(rect.height, precision)
  const x = round(rect.x, precision)
  const y = round(rect.y, precision)
  const opacity = node.shimmer ? ` opacity="0.45"` : ''

  // Avatars render as true circles centred in their box.
  if (node.kind === 'avatar') {
    const r = round(Math.min(w, h) / 2, precision)
    const cx = round(x + w / 2, precision)
    const cy = round(y + h / 2, precision)
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${opacity}/>`
  }

  const radius = round(node.kind === 'radio' ? Math.min(w, h) / 2 : Math.max(0, node.radius), precision)
  const rxy = radius > 0 ? ` rx="${radius}" ry="${radius}"` : ''
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}"${rxy} fill="${fill}"${opacity}/>`
}

/**
 * Build the `<svg>` overlay blueprint for a set of scanned nodes.
 *
 * The `<svg>` viewBox is clamped to the exact host bounding box (CLS Guard) so
 * the overlay can never overflow by a pixel, and `preserveAspectRatio="none"`
 * keeps every rect pinned to its measured position at any scale.
 */
export function buildBlueprint(
  nodes: ScannedNode[],
  container: SkeletonRect,
  opts: SvgRendererOptions,
): SvgBlueprint {
  const w = dim(container.width, opts.precision)
  const h = dim(container.height, opts.precision)
  const sharedId = gradientId(opts.uid)
  const mode = visualMode(opts)

  const defs: string[] = []
  const shapes: string[] = []

  if (opts.sharedGradient) {
    // No gradient is emitted when there is no animation (static flat fill).
    if (mode !== 'none') defs.push(gradientDef(sharedId, opts, mode))
    const fill = fillFor(sharedId, mode)
    for (const node of nodes) shapes.push(shapeFor(node, fill, opts.precision))
  }
  else {
    nodes.forEach((node, i) => {
      const id = gradientId(opts.uid, i)
      if (mode !== 'none') defs.push(gradientDef(id, opts, mode))
      shapes.push(shapeFor(node, fillFor(id, mode), opts.precision))
    })
  }

  const svg
    = `<svg xmlns="${SVG_NS}" class="sk-svg sk-svg--${mode}" width="${w}" height="${h}" `
      + `viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Caricamento…" `
      + `style="--sk-duration:${Math.max(0, opts.durationMs)}ms">`
      + `<defs>${defs.join('')}</defs>`
      + shapes.join('')
      + `</svg>`

  return {
    svg,
    nodeCount: shapes.length,
    width: w,
    height: h,
    gradientId: sharedId,
    tier: opts.tier,
  }
}
