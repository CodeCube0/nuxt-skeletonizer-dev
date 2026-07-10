import type { SkeletonizerOptions } from '../src/types'

/** A complete default config for tests (mirrors the module defaults). */
export function makeConfig(overrides: Partial<SkeletonizerOptions> = {}): SkeletonizerOptions {
  return {
    enabled: true,
    autoScan: true,
    shimmer: true,
    shimmerDuration: 1200,
    animation: 'wave',
    baseColor: '#e5e7eb',
    highlightColor: '#f8fafc',
    darkBaseColor: '#2a2a2a',
    darkHighlightColor: '#3a3a3a',
    borderRadius: '0.375rem',
    opacity: 1,
    respectBorderRadius: true,
    debug: false,
    darkModeSelector: '.dark',
    scanDebounce: 50,
    maxScanDepth: 64,
    // SVG renderer.
    renderMode: 'svg',
    svgPrecision: 1,
    svgSharedGradient: true,
    // Adaptive / telemetry — conservative defaults (mirror the module defaults).
    adaptive: false,
    minFps: 45,
    telemetry: false,
    offThread: false,
    layoutCache: false,
    explain: false,
    ...overrides,
  }
}
