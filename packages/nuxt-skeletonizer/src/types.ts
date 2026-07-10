/**
 * Shared type definitions for nuxt-skeletonizer.
 *
 * These types are consumed both at build time (the Nuxt module) and at
 * runtime (plugin, composable, engine, components). Keep this file free of
 * any Nuxt/Node imports so it can be safely bundled into the client.
 *
 * Architecture: the engine has a single rendering backend — **SVG**. The scan
 * layer measures the host subtree into {@link ScannedNode}s and the SVG
 * renderer turns them into one `<svg>` overlay ({@link SvgBlueprint}). There is
 * no multi-backend switching, no DOM/Canvas/Virtual renderer and no runtime
 * strategy selection — SVG is the architecture.
 */

/**
 * Built-in animation presets. Custom presets can be registered at runtime via
 * `useSkeletonizer().registerAnimation()` and referenced here by name.
 */
export type SkeletonAnimation
  = | 'wave'
    | 'pulse'
    | 'fade'
    | 'gradient'
    | 'shine'
    | 'none'
    | (string & {})

/**
 * The semantic kind of a skeleton "bone". The automatic engine classifies DOM
 * nodes into one of these, and the manual components map 1:1 onto them.
 */
export type SkeletonBoneKind
  = | 'text'
    | 'heading'
    | 'image'
    | 'avatar'
    | 'badge'
    | 'tag'
    | 'button'
    | 'card'
    | 'icon'
    | 'input'
    | 'textarea'
    | 'select'
    | 'checkbox'
    | 'radio'
    | 'switch'
    | 'table'
    | 'list'
    | 'custom'
    | 'block'
    | 'container'

/**
 * The one and only rendering mode. Exposed as a read-only constant on the
 * resolved config so callers can assert it, but it can never be switched.
 */
export type SkeletonRenderMode = 'svg'

/**
 * Theme tokens. Every value maps onto a CSS custom property (`--sk-*`) so the
 * whole system can be themed and switched at runtime without re-rendering.
 */
export interface SkeletonThemeTokens {
  /** Base (resting) color of a bone. */
  baseColor?: string
  /** Highlight color used by shimmer/wave/gradient animations. */
  highlightColor?: string
  /** Base color used when the `dark` class/media query is active. */
  darkBaseColor?: string
  /** Highlight color used in dark mode. */
  darkHighlightColor?: string
  /** Default border radius applied to bones (any valid CSS length). */
  borderRadius?: string
  /** Resting opacity of bones. */
  opacity?: number
}

/**
 * Graceful animation degradation tiers. The Adaptive Animation System steps
 * down this ladder as FPS pressure rises, and back up as it recovers.
 *
 * `full` (wave/gradient/shine) → `reduced` (pulse) → `static` (no animation).
 */
export type SkeletonAnimationTier = 'full' | 'reduced' | 'static'

/** Where layout blueprints are cached. `false` disables the cache entirely. */
export type SkeletonCacheMode = false | 'memory' | 'session'

/**
 * Resolved, runtime-facing configuration. Every field is required here because
 * the module fills defaults via `defu` before exposing it on `runtimeConfig`.
 */
export interface SkeletonizerOptions {
  /** Master switch. When false the module is inert (and tree-shakes well). */
  enabled: boolean
  /** Enable the automatic DOM-scanning engine inside `<Skeletonizer>`. */
  autoScan: boolean
  /** Globally enable the shimmer/highlight sweep on bones. */
  shimmer: boolean
  /** Duration of one shimmer/animation cycle, in milliseconds. */
  shimmerDuration: number
  /** Default animation preset. */
  animation: SkeletonAnimation
  /** Light-theme base color. */
  baseColor: string
  /** Light-theme highlight color. */
  highlightColor: string
  /** Dark-theme base color. */
  darkBaseColor: string
  /** Dark-theme highlight color. */
  darkHighlightColor: string
  /** Default bone border radius. */
  borderRadius: string
  /** Resting bone opacity. */
  opacity: number
  /** Preserve the element's own border-radius in the generated SVG rects. */
  respectBorderRadius: boolean
  /** Emit verbose diagnostics from the engine to the console. */
  debug: boolean
  /** Selector for the dark-mode root (defaults to `.dark`). */
  darkModeSelector: string
  /** Debounce window (ms) for MutationObserver-triggered re-scans. */
  scanDebounce: number
  /** Maximum DOM depth the engine will descend (guards pathological trees). */
  maxScanDepth: number

  // --- SVG renderer ------------------------------------------------------

  /**
   * The rendering mode. Read-only — SVG is the only backend. Present so callers
   * can assert `config.renderMode === 'svg'`; setting it to anything else is a
   * type error.
   */
  renderMode: SkeletonRenderMode
  /** Decimal places used when rounding SVG coordinates (default `1`). */
  svgPrecision: number
  /**
   * Use a single shared `<linearGradient>` in `<defs>` (default `true`) versus
   * one gradient per shape. Shared is cheaper and is almost always correct.
   */
  svgSharedGradient: boolean

  // --- Adaptive / telemetry (opt-in, default off) ------------------------

  /**
   * Master switch for the Adaptive Animation System (FPS-driven tier
   * degradation, shimmer auto-disable). Off by default so the engine stays a
   * pure SVG painter unless explicitly opted in.
   */
  adaptive: boolean
  /** Frames-per-second floor; sustained drops below this degrade the tier. */
  minFps: number
  /** Collect runtime telemetry (scan/render timings, FPS, memory, cache). */
  telemetry: boolean
  /** Offload heavy compute (fingerprints, telemetry) to a Web Worker / idle. */
  offThread: boolean
  /** Layout blueprint cache backend. `false` disables caching entirely. */
  layoutCache: SkeletonCacheMode
  /** Emit natural-language explanations of engine decisions (Explain Mode). */
  explain: boolean
}

/** Live signals fed to the score and the Adaptive Animation System. */
export interface SkeletonRuntimeSignals {
  /** Smoothed frames-per-second measured during loading. */
  fps: number
  /** Heuristic CPU pressure in [0,1] derived from frame-time jitter. */
  cpu: number
  /** Total shapes the current blueprint would draw. */
  boneCount: number
  /** Estimated JS heap usage in MB (Chromium only; 0 elsewhere). */
  memoryMB: number
  /** Composite performance score in [0,100] (higher is healthier). */
  score: number
  /** Whether any data request / scope is currently loading. */
  loading: boolean
  /** Device hardware concurrency (logical cores), 0 when unknown. */
  cores: number
  /** Whether the user prefers reduced motion. */
  reducedMotion: boolean
}

/** A bounding box relative to a host origin (its top-left), in CSS px. */
export interface SkeletonRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * A single classified, measured node produced by the scan layer. The source
 * element is read-only — it is never moved, wrapped, mutated or removed; the
 * SVG renderer draws an overlay from the geometry alone.
 */
export interface ScannedNode {
  /** Source element (read-only; carried so callers can correlate, never mutated). */
  el: HTMLElement
  kind: SkeletonBoneKind
  /** Bounding box relative to the host top-left, in CSS px. */
  rect: SkeletonRect
  /** Border radius (px) to honour for CLS-accurate rendering. */
  radius: number
  /** Depth in the host subtree. */
  depth: number
  /**
   * When true the node is a `v-skeleton-shimmer` target: the SVG draws a
   * translucent shimmer rect over it but the real content stays visible.
   */
  shimmer?: boolean
}

/** Options that steer a single SVG render. */
export interface SvgRendererOptions {
  /** Decimal places for coordinate rounding. */
  precision: number
  /** Use one shared `<linearGradient>` in `<defs>` vs one per shape. */
  sharedGradient: boolean
  /** Whether the shimmer animation is active at all. */
  shimmer: boolean
  /**
   * The resolved animation preset (already folded through the tier ladder).
   * Sweep-style presets (`wave`/`gradient`/`shine`) animate the gradient; `pulse`
   * and `fade` breathe the opacity; `none` is a static fill.
   */
  animation: SkeletonAnimation
  /** Active animation tier (full → wave, reduced → pulse, static → none). */
  tier: SkeletonAnimationTier
  /** Unique suffix used to namespace the gradient id (`sk-shimmer-{uid}`). */
  uid: string
  /** Honour each node's own border-radius vs the themed default. */
  respectBorderRadius: boolean
  /** Animation cycle duration (ms) baked into the SMIL `dur` attribute. */
  durationMs: number
}

/**
 * The output of the SVG renderer: a serialized `<svg>` overlay plus the
 * metadata DevTools and the cache need. The markup is SSR-safe — it serializes
 * to a string on the server and hydrates without mismatch on the client.
 */
export interface SvgBlueprint {
  /** Serialized `<svg>` markup (the overlay). */
  svg: string
  /** Number of `<rect>`/`<circle>` shapes drawn. */
  nodeCount: number
  /** viewBox / overlay width (host bounding box). */
  width: number
  /** viewBox / overlay height (host bounding box). */
  height: number
  /** The namespaced gradient id used by every shape. */
  gradientId: string
  /** Animation tier baked into this blueprint. */
  tier: SkeletonAnimationTier
}

/**
 * A layout fingerprint: the identity used to cache an {@link SvgBlueprint}.
 * Hash = route path + viewport bucket + component UID.
 */
export interface LayoutFingerprint {
  /** Route path the host lives on. */
  route: string
  /** Viewport size (bucketed) at scan time. */
  viewport: { width: number, height: number }
  /** Stable per-host component id. */
  uid: string
  /** The computed cache key (FNV-1a hash of the above). */
  key: string
}

/** Per-stage timings (ms) captured by the telemetry layer. */
export interface SkeletonStageTimings {
  /** Scan + classify + measure time. */
  scanMs: number
  /** SVG blueprint generation + injection time. */
  renderMs: number
  /** End-to-end pipeline time. */
  totalMs: number
}

/** A natural-language explanation of an engine decision (Explain Mode). */
export interface SkeletonExplainEntry {
  /** Monotonic sequence number. */
  seq: number
  /** Short machine code, e.g. `cache:hit`, `degrade:animation`. */
  code: string
  /** Human-readable sentence, e.g. "Blueprint SVG servito dalla cache". */
  message: string
  /** Relative timestamp (ms since engine boot) — pass-in to stay SSR-safe. */
  at: number
}

/** Public, partial config as accepted in `nuxt.config.ts`. */
export type SkeletonizerModuleOptions = Partial<SkeletonizerOptions>

/**
 * Options accepted by a `<Skeletonizer>` instance / `useSkeletonizer` scope.
 * These override the global config for the subtree they apply to.
 */
export interface SkeletonScopeOptions {
  enabled?: boolean
  animation?: SkeletonAnimation
  shimmer?: boolean
  autoScan?: boolean
  theme?: SkeletonThemeTokens
}

/** Live engine statistics, surfaced to DevTools and the composable. */
export interface SkeletonizerStats {
  /** Number of `<Skeletonizer>` hosts currently mounted. */
  hosts: number
  /** Number of SVG shapes drawn in the most recent render. */
  bones: number
  /** Elements explicitly ignored (via directive/attribute). */
  ignored: number
  /** Total scans performed since load. */
  scans: number
  /** Duration of the most recent scan+render, in milliseconds. */
  lastScanMs: number
  /** Whether skeleton mode is globally enabled right now. */
  enabled: boolean

  /** The active render mode — always `'svg'`. */
  renderMode: SkeletonRenderMode
  /** Composite performance score in [0,100]. */
  score: number
  /** Smoothed FPS sampled during loading (0 when idle). */
  fps: number
  /** Active animation degradation tier. */
  animationTier: SkeletonAnimationTier
  /** Estimated JS heap usage (MB); Chromium-only, 0 elsewhere. */
  memoryMB: number
  /** Blueprint cache hits since load. */
  cacheHits: number
  /** Blueprint cache misses since load. */
  cacheMisses: number
  /** Whether the engine is currently in a degraded (non-full) animation tier. */
  degraded: boolean
  /** Most recent per-stage timings. */
  timings: SkeletonStageTimings
}

/** A registrable animation definition. */
export interface SkeletonAnimationDefinition {
  /** Unique name used as the value of the `animation` option. */
  name: string
  /** CSS injected once when the animation is registered (keyframes + rules). */
  css: string
}

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    skeletonizer: SkeletonizerOptions
  }
}
