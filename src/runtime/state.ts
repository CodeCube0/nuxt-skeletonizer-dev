import { computed, reactive, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import type {
  ScannedNode,
  SkeletonAnimation,
  SkeletonAnimationDefinition,
  SkeletonAnimationTier,
  SkeletonizerOptions,
  SkeletonizerStats,
  SkeletonStageTimings,
  SkeletonThemeTokens,
} from '../types'
import { registerAnimation as registerAnimationCss } from './animations'
import { SkeletonEngine } from './engine/pipeline'
import { setThemeTokens } from './theme/theme'

/**
 * Contract every `<Skeletonizer>` host registers with the store, letting the
 * global composable drive re-scans and teardown across all mounted hosts.
 */
export interface HostController {
  id: number
  /** Re-run the engine scan for this host. */
  scan: () => void
  /** Restore the host's DOM to its original state. */
  restore: () => void
  /** Report this host's latest scan figures. */
  report: () => HostReport
}

/** The result of the most recent `scan()` for a host. */
export interface ScanResult {
  /** Freshly scanned nodes (empty on a cache hit). */
  nodes: ScannedNode[]
  /** The generated `<svg>` overlay markup. */
  svg: string
  /** Whether the blueprint was served from the cache. */
  cacheHit: boolean
}

/** A host's latest render figures. */
export interface HostReport {
  bones: number
  ignored: number
  lastScanMs: number
  animationTier?: SkeletonAnimationTier
  shimmer?: boolean
  fromCache?: boolean
  timings?: SkeletonStageTimings
}

export interface SkeletonizerStore {
  /** The resolved, reactive configuration. */
  config: SkeletonizerOptions
  /** Manual global enabled flag (overridable per-scope by `<Skeletonizer enabled>`). */
  enabled: Ref<boolean>
  /** Read-only effective state: manual flag OR any auto-loading in flight. */
  isEnabled: ComputedRef<boolean>
  /** Number of in-flight skeleton-aware data requests. */
  loadingCount: Ref<number>
  /** Aggregated, reactive runtime statistics (for DevTools / debugging). */
  stats: SkeletonizerStats
  enable: () => void
  disable: () => void
  toggle: () => boolean
  /** Increment the auto-loading counter (turns skeleton on while > 0). */
  beginLoading: () => void
  /** Decrement the auto-loading counter. */
  endLoading: () => void
  /** Re-scan every mounted host. Alias: `scan`. */
  refresh: () => void
  /** Re-scan every mounted host and return the most recent blueprint info. */
  scan: () => ScanResult
  /** Switch theme tokens at runtime (global, unless a target is given). */
  setTheme: (tokens: SkeletonThemeTokens, target?: HTMLElement) => void
  /** Set the active animation preset globally. */
  setAnimation: (animation: SkeletonAnimation) => void
  /** Register a custom animation. */
  registerAnimation: (def: SkeletonAnimationDefinition) => void

  /** The per-app SVG/adaptive engine (cross-host subsystems). */
  engine: SkeletonEngine

  /** @internal host registry */
  _hosts: Set<HostController>
  /** @internal */
  _register: (host: HostController) => void
  /** @internal */
  _unregister: (host: HostController) => void
  /** @internal recompute aggregated stats from all hosts */
  _recompute: () => void
  /** @internal monotonic host id source */
  _nextId: () => number
}

/**
 * Build a fresh store. One instance is created per Nuxt app in the plugin and
 * provided to the component tree — never a module-level singleton, so SSR
 * requests never share state.
 */
export function createSkeletonizerStore(config: SkeletonizerOptions): SkeletonizerStore {
  const reactiveConfig = reactive({ ...config }) as SkeletonizerOptions
  const enabled = ref(config.enabled)
  const loadingCount = ref(0)
  const isEnabled = computed(() => enabled.value || loadingCount.value > 0)
  const hosts = new Set<HostController>()
  let idSeq = 0

  // The per-app engine reads the live (reactive) config on every render.
  const engine = new SkeletonEngine(() => reactiveConfig)

  const stats = reactive<SkeletonizerStats>({
    hosts: 0,
    bones: 0,
    ignored: 0,
    scans: 0,
    lastScanMs: 0,
    enabled: isEnabled.value,
    renderMode: 'svg',
    score: 100,
    fps: 0,
    animationTier: 'full',
    memoryMB: 0,
    cacheHits: 0,
    cacheMisses: 0,
    degraded: false,
    timings: SkeletonEngine.emptyTimings,
  })

  // Drive FPS sampling from the effective enabled state (TAR §1: on only during
  // the loading/transition phase; the engine itself gates by config so there is
  // zero overhead unless adaptive/telemetry is enabled).
  const syncLoading = (): void => engine.setLoading(isEnabled.value)

  const recompute = (): void => {
    let bones = 0
    let ignored = 0
    let lastScanMs = 0
    let animationTier: SkeletonAnimationTier | undefined
    for (const host of hosts) {
      const r = host.report()
      bones += r.bones
      ignored += r.ignored
      lastScanMs = Math.max(lastScanMs, r.lastScanMs)
      if (r.animationTier) animationTier = r.animationTier
    }
    stats.hosts = hosts.size
    stats.bones = bones
    stats.ignored = ignored
    stats.lastScanMs = lastScanMs
    stats.enabled = isEnabled.value

    // Fold in the live adaptive/telemetry signals from the engine.
    const snap = engine.snapshot(bones)
    stats.animationTier = animationTier ?? snap.animationTier
    stats.score = snap.score
    stats.fps = snap.fps
    stats.memoryMB = snap.memoryMB
    stats.cacheHits = snap.cacheHits
    stats.cacheMisses = snap.cacheMisses
    stats.degraded = snap.degraded
    stats.timings = snap.timings
  }

  const refresh = (): void => {
    for (const host of hosts) host.scan()
    stats.scans++
    recompute()
  }

  const scan = (): ScanResult => {
    refresh()
    const last = engine.lastResult
    return {
      nodes: last?.nodes ?? [],
      svg: last?.blueprint.svg ?? '',
      cacheHit: last?.fromCache ?? false,
    }
  }

  const store: SkeletonizerStore = {
    config: reactiveConfig,
    enabled,
    isEnabled,
    loadingCount,
    stats,
    enable() {
      enabled.value = true
      stats.enabled = isEnabled.value
      syncLoading()
    },
    disable() {
      enabled.value = false
      stats.enabled = isEnabled.value
      syncLoading()
    },
    toggle() {
      enabled.value = !enabled.value
      stats.enabled = isEnabled.value
      syncLoading()
      return isEnabled.value
    },
    beginLoading() {
      loadingCount.value++
      stats.enabled = isEnabled.value
      syncLoading()
    },
    endLoading() {
      loadingCount.value = Math.max(0, loadingCount.value - 1)
      stats.enabled = isEnabled.value
      syncLoading()
    },
    refresh,
    scan,
    setTheme(tokens, target) {
      if (tokens.baseColor !== undefined) reactiveConfig.baseColor = tokens.baseColor
      if (tokens.highlightColor !== undefined) reactiveConfig.highlightColor = tokens.highlightColor
      if (tokens.darkBaseColor !== undefined) reactiveConfig.darkBaseColor = tokens.darkBaseColor
      if (tokens.darkHighlightColor !== undefined) reactiveConfig.darkHighlightColor = tokens.darkHighlightColor
      if (tokens.borderRadius !== undefined) reactiveConfig.borderRadius = tokens.borderRadius
      if (tokens.opacity !== undefined) reactiveConfig.opacity = tokens.opacity
      setThemeTokens(tokens, target)
    },
    setAnimation(animation) {
      reactiveConfig.animation = animation
    },
    registerAnimation(def) {
      registerAnimationCss(def)
    },
    engine,
    _hosts: hosts,
    _register(host) {
      hosts.add(host)
      recompute()
    },
    _unregister(host) {
      hosts.delete(host)
      recompute()
    },
    _recompute: recompute,
    _nextId: () => ++idSeq,
  }

  return store
}

/** Injection key for providing the store through the Vue component tree. */
export const SKELETONIZER_KEY: InjectionKey<SkeletonizerStore> = Symbol('nuxt-skeletonizer')

/**
 * Injection key carrying the *effective* enabled state of the nearest enclosing
 * `<Skeletonizer>`. Manual `Skeleton*` primitives read it so that, when dropped
 * inside a `<Skeletonizer>`, they follow that scope's toggle (show their bone
 * while active, reveal their real-content slot when disabled).
 */
export const SKELETON_SCOPE_KEY: InjectionKey<ComputedRef<boolean>> = Symbol('nuxt-skeletonizer-scope')

/**
 * Fallback store reference for callers outside a component `setup()` (e.g.
 * other Nuxt plugins) and for tests. In components the request-safe `inject`
 * path is used instead. Set by the plugin on app creation.
 */
let activeStore: SkeletonizerStore | null = null

/** @internal */
export function setActiveStore(store: SkeletonizerStore | null): void {
  activeStore = store
}

/** @internal */
export function getActiveStore(): SkeletonizerStore | null {
  return activeStore
}
