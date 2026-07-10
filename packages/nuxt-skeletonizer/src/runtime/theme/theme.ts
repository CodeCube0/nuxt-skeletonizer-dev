import type { SkeletonizerOptions, SkeletonThemeTokens } from '../../types'

/** Mapping from theme token → CSS custom property name. */
const VAR = {
  baseColor: '--sk-base-color',
  highlightColor: '--sk-highlight-color',
  darkBaseColor: '--sk-dark-base-color',
  darkHighlightColor: '--sk-dark-highlight-color',
  borderRadius: '--sk-radius',
  opacity: '--sk-opacity',
  duration: '--sk-duration',
} as const

/** True only in a browser-like environment with a live document. */
function canTouchDom(): boolean {
  return typeof document !== 'undefined' && !!document.documentElement
}

/**
 * Write the resolved configuration onto the document root as CSS variables.
 * Called once on the client when the plugin boots. Safe to call on the server
 * (it no-ops) so SSR doesn't crash.
 */
export function applyBaseTheme(config: SkeletonizerOptions): void {
  if (!canTouchDom()) return
  const root = document.documentElement
  root.style.setProperty(VAR.baseColor, config.baseColor)
  root.style.setProperty(VAR.highlightColor, config.highlightColor)
  root.style.setProperty(VAR.darkBaseColor, config.darkBaseColor)
  root.style.setProperty(VAR.darkHighlightColor, config.darkHighlightColor)
  root.style.setProperty(VAR.borderRadius, config.borderRadius)
  root.style.setProperty(VAR.opacity, String(config.opacity))
  root.style.setProperty(VAR.duration, `${config.shimmerDuration}ms`)
}

/**
 * Apply theme token overrides at runtime. Targets the document root by default
 * (global theme switch) or a specific element for a scoped theme.
 */
export function setThemeTokens(
  tokens: SkeletonThemeTokens,
  target?: HTMLElement,
): void {
  if (!canTouchDom() && !target) return
  const root = target ?? document.documentElement
  if (tokens.baseColor !== undefined) root.style.setProperty(VAR.baseColor, tokens.baseColor)
  if (tokens.highlightColor !== undefined) root.style.setProperty(VAR.highlightColor, tokens.highlightColor)
  if (tokens.darkBaseColor !== undefined) root.style.setProperty(VAR.darkBaseColor, tokens.darkBaseColor)
  if (tokens.darkHighlightColor !== undefined) root.style.setProperty(VAR.darkHighlightColor, tokens.darkHighlightColor)
  if (tokens.borderRadius !== undefined) root.style.setProperty(VAR.borderRadius, tokens.borderRadius)
  if (tokens.opacity !== undefined) root.style.setProperty(VAR.opacity, String(tokens.opacity))
}

/** The CSS variable names, exported for components/tests. */
export const THEME_VARS = VAR
