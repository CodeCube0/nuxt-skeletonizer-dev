import { inject } from 'vue'
import { getActiveStore, SKELETONIZER_KEY, type SkeletonizerStore } from './state'

/**
 * Resolve a CSS size from a number (→ `px`) or pass a string through verbatim.
 * Returns `undefined` for nullish input so it can be spread into a style object.
 */
export function cssSize(value?: string | number | null): string | undefined {
  if (value === undefined || value === null) return undefined
  return typeof value === 'number' ? `${value}px` : value
}

/**
 * Resolve a CSS size to an approximate pixel value, for SVG geometry that needs
 * a concrete number (e.g. vertical metrics). Percentages and unknown units fall
 * back to `fallback`. `rem`/`em` are approximated at 16px.
 */
export function pxSize(value: string | number | undefined | null, fallback = 0): number {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'number') return value
  const n = Number.parseFloat(value)
  if (!Number.isFinite(n)) return fallback
  if (value.includes('%')) return fallback
  if (value.includes('rem') || value.includes('em')) return n * 16
  return n
}

/**
 * Resolve a width expressed as a percentage (`'60%'`) or a 0–100 number into a
 * percentage string for an SVG horizontal coordinate. Pixel/`rem` widths are
 * passed through verbatim (SVG accepts px lengths on rect width).
 */
export function svgWidthValue(value: string | number | undefined | null, fallback = '100%'): string {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'number') return `${value}px`
  return value
}

/**
 * Get the skeletonizer store from injection (request-safe) with a module-level
 * fallback. Returns `null` when used entirely outside a Nuxt/plugin context;
 * components degrade to sensible literal defaults in that case.
 */
export function useSkeletonStore(): SkeletonizerStore | null {
  return inject(SKELETONIZER_KEY, null) ?? getActiveStore()
}
