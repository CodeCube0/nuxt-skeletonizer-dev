import type {
  ScannedNode,
  SkeletonAnimationTier,
  SkeletonizerOptions,
  SkeletonRuntimeSignals,
  SkeletonStageTimings,
  SvgBlueprint,
} from '../../../types'
import { CLASS } from '../../constants'
import { AnimationMicrocontroller, tierToAnimation } from '../animation/microcontroller'
import { now } from '../clock'
import { BottleneckTracker } from '../devtools/bottleneck'
import { ExplainLog, explainDecision } from '../devtools/explain'
import { LayoutFingerprintCache, layoutFingerprint } from '../intelligence/fingerprint'
import { FpsSampler } from '../perf/fps'
import { computeScore, prefersReducedMotion, readCores, readMemoryMB } from '../perf/score'
import { buildBlueprint } from '../render/svg'
import { scanSubtree } from '../scanner'
import { OffThreadCompute } from '../telemetry/offthread'
import { TelemetryCollector } from '../telemetry/telemetry'
import { resolveDecision } from './adaptive'

/**
 * The Layered SVG Engine.
 *
 * One instance per Nuxt app owns every cross-host subsystem and runs the
 * single-backend pipeline for each `<Skeletonizer>` host:
 *
 *   Scan / Classify / Measure (with the blueprint cache)
 *        → SVG Render (one `<svg>` overlay, CLS-clamped viewBox)
 *        → Inject (hide real content, mount overlay — zero layout shift)
 *        → Telemetry & Adaptive Animation (FPS-driven tier feedback).
 *
 * FPS sampling only runs while loading (TAR §1): callers drive
 * {@link SkeletonEngine.setLoading}, and the sampler is alive solely during the
 * skeleton phase and idles at zero cost otherwise — and only when
 * `adaptive`/`telemetry` is enabled.
 */
export interface HostMeta {
  id: number
  label: string
  /** Base animation preset used at the `full` tier. */
  animation: string
  /** Whether shimmer is desired for this scope. */
  shimmer: boolean
}

export interface HostRenderResult {
  /** SVG shapes drawn. */
  bones: number
  ignored: number
  /** Kept named `lastScanMs` to satisfy the existing HostController contract. */
  lastScanMs: number
  animationTier: SkeletonAnimationTier
  shimmer: boolean
  timings: SkeletonStageTimings
  fromCache: boolean
  /** The generated blueprint (markup + metadata), for DevTools/cache/scan(). */
  blueprint: SvgBlueprint
  /** The freshly scanned nodes (empty on a cache hit). */
  nodes: ScannedNode[]
}

interface OverlayState {
  overlay: HTMLElement
  prevPosition: string
}

const EMPTY_TIMINGS: SkeletonStageTimings = { scanMs: 0, renderMs: 0, totalMs: 0 }

const EMPTY_BLUEPRINT: SvgBlueprint = {
  svg: '',
  nodeCount: 0,
  width: 0,
  height: 0,
  gradientId: '',
  tier: 'full',
}

function currentRoute(): string {
  return typeof location !== 'undefined' ? location.pathname : '/'
}

function currentViewport(): { width: number, height: number } {
  return typeof window !== 'undefined'
    ? { width: window.innerWidth, height: window.innerHeight }
    : { width: 0, height: 0 }
}

/** Convert a themed CSS radius (e.g. `0.375rem`) to an approximate px value. */
function radiusToPx(value: string): number {
  const n = Number.parseFloat(value)
  if (!Number.isFinite(n)) return 0
  if (value.includes('rem') || value.includes('em')) return n * 16
  if (value.includes('%')) return 0
  return n
}

export class SkeletonEngine {
  readonly fps: FpsSampler
  readonly micro: AnimationMicrocontroller
  readonly cache: LayoutFingerprintCache
  readonly telemetry: TelemetryCollector
  readonly explain: ExplainLog
  readonly bottleneck: BottleneckTracker
  readonly offthread: OffThreadCompute

  /** Mounted overlay per host element, so teardown is exact. */
  private overlays = new WeakMap<HTMLElement, OverlayState>()
  /** The last fingerprint key used per host id (for targeted invalidation). */
  private hostKey = new Map<number, string>()
  private booted = now()
  private loading = false
  /** The route the cache was last keyed against, for route-change eviction. */
  private lastRoute = currentRoute()
  /** Most recent host render result, surfaced as global display stats. */
  lastResult: HostRenderResult | null = null

  constructor(private getConfig: () => SkeletonizerOptions) {
    const cfg = getConfig()
    this.fps = new FpsSampler({})
    this.micro = new AnimationMicrocontroller({ minFps: cfg.minFps })
    this.cache = new LayoutFingerprintCache(cfg.layoutCache)
    this.telemetry = new TelemetryCollector()
    this.explain = new ExplainLog(100, cfg.explain)
    this.bottleneck = new BottleneckTracker()
    this.offthread = new OffThreadCompute(cfg.offThread)
  }

  /** Toggle the loading phase — starts/stops FPS sampling (TAR §1). */
  setLoading(on: boolean): void {
    if (on === this.loading) return
    this.loading = on
    const cfg = this.getConfig()
    const wantsSampling = cfg.adaptive || cfg.telemetry
    if (on && wantsSampling) this.fps.start()
    else this.fps.stop()
  }

  get isLoading(): boolean {
    return this.loading
  }

  /** Build the live runtime signals fed to the score and microcontroller. */
  signals(boneCount: number): SkeletonRuntimeSignals {
    const fps = this.fps.active ? this.fps.fps : 0
    const cpu = this.fps.active ? this.fps.cpu : 0
    const memoryMB = readMemoryMB()
    const score = computeScore({ fps: fps || 60, cpu, memoryMB, boneCount }, {
      minFps: this.getConfig().minFps,
      heavyNodes: 1500,
      memoryCeilingMB: 512,
    }).value
    return {
      fps,
      cpu,
      boneCount,
      memoryMB,
      score,
      loading: this.loading,
      cores: readCores(),
      reducedMotion: prefersReducedMotion(),
    }
  }

  /** Keep mutable subsystems in sync with the (reactive) config each render. */
  private syncConfig(cfg: SkeletonizerOptions): void {
    this.explain.setEnabled(cfg.explain)
  }

  /**
   * Run the full SVG pipeline for one host: scan (or replay from cache) → build
   * the `<svg>` blueprint → inject it as an overlay → record telemetry. Returns
   * the figures the store/host surface as live stats.
   */
  renderHost(host: HTMLElement, meta: HostMeta): HostRenderResult {
    const cfg = this.getConfig()
    this.syncConfig(cfg)
    const t0 = now()
    const at = t0 - this.booted
    const route = currentRoute()
    const viewport = currentViewport()
    const uid = String(meta.id)

    // Route changed → drop the previous route's blueprints.
    if (route !== this.lastRoute) {
      this.cache.invalidateRoute(this.lastRoute)
      this.lastRoute = route
    }

    // --- Adaptive decision (tier + shimmer) --------------------------------
    const fingerprint = layoutFingerprint(route, viewport, uid)
    const microTier = this.micro.update(this.signals(this.lastResult?.bones ?? 0), at)
    const decisionSignals = this.signals(this.lastResult?.bones ?? 0)
    const decision = resolveDecision({
      signals: decisionSignals,
      microTier,
      config: { shimmer: meta.shimmer, adaptive: cfg.adaptive },
    })
    for (const r of decision.reasons) {
      this.explain.push(r.code, explainDecision(r.code, r.detail), at)
    }

    // --- Scan / Measure (with blueprint cache) -----------------------------
    const scanStart = now()
    let blueprint: SvgBlueprint | null = null
    let fromCache = false
    let bones = 0
    let ignored = 0
    let scannedNodes: ScannedNode[] = []

    if (cfg.layoutCache !== false) {
      const cached = this.cache.get(fingerprint.key)
      // Replay the cache only when the tier matches (so a degraded render is
      // not served as `full`). Otherwise fall through to a fresh scan.
      if (cached && cached.tier === decision.animationTier) {
        blueprint = cached
        fromCache = true
        bones = cached.nodeCount
        this.telemetry.noteCache(true)
        this.explain.push('cache:hit', explainDecision('cache:hit', { nodes: cached.nodeCount }), at)
      }
      else {
        this.telemetry.noteCache(false)
      }
    }

    if (!blueprint) {
      const scan = scanSubtree(host, {
        respectBorderRadius: cfg.respectBorderRadius,
        defaultRadius: radiusToPx(cfg.borderRadius),
        maxDepth: cfg.maxScanDepth,
        debug: cfg.debug,
      })
      ignored = scan.ignored
      scannedNodes = scan.nodes
      const containerRect = host.getBoundingClientRect()
      blueprint = buildBlueprint(
        scan.nodes,
        { x: 0, y: 0, width: containerRect.width, height: containerRect.height },
        {
          precision: cfg.svgPrecision,
          sharedGradient: cfg.svgSharedGradient,
          shimmer: decision.shimmer,
          animation: this.animationFor(decision.animationTier, meta.animation),
          tier: decision.animationTier,
          uid,
          respectBorderRadius: cfg.respectBorderRadius,
          durationMs: cfg.shimmerDuration,
        },
      )
      bones = blueprint.nodeCount
      if (cfg.layoutCache !== false) {
        this.cache.set(fingerprint, blueprint, at)
      }
    }
    const scanMs = now() - scanStart
    this.hostKey.set(meta.id, fingerprint.key)

    // --- Inject the overlay ------------------------------------------------
    const renderStart = now()
    this.mountOverlay(host, blueprint.svg)
    const renderMs = now() - renderStart

    // --- Telemetry ---------------------------------------------------------
    const totalMs = now() - t0
    const timings: SkeletonStageTimings = { scanMs, renderMs, totalMs }
    if (cfg.telemetry) {
      this.telemetry.record({
        at,
        timings,
        fps: decisionSignals.fps,
        cpu: decisionSignals.cpu,
        memoryMB: decisionSignals.memoryMB,
        boneCount: bones,
        strategy: 'svg',
      })
      this.bottleneck.record(meta.id, meta.label, scanMs, renderMs, bones)
      // Offload a heavy hash of the generated markup off the main thread.
      if (cfg.offThread) void this.offthread.run({ type: 'fingerprint', payload: blueprint.svg })
    }

    const result: HostRenderResult = {
      bones,
      ignored,
      lastScanMs: totalMs,
      animationTier: decision.animationTier,
      shimmer: decision.shimmer,
      timings,
      fromCache,
      blueprint,
      nodes: scannedNodes,
    }
    this.lastResult = result
    return result
  }

  /** Hide the host content and mount the SVG overlay (zero CLS). */
  private mountOverlay(host: HTMLElement, svg: string): void {
    this.unmountOverlay(host)
    const prevPosition = host.style.position
    if (typeof getComputedStyle === 'function' && getComputedStyle(host).position === 'static') {
      host.style.position = 'relative'
    }
    host.classList.add(CLASS.svgHidden)
    const overlay = document.createElement('div')
    overlay.className = CLASS.overlay
    overlay.innerHTML = svg
    host.appendChild(overlay)
    this.overlays.set(host, { overlay, prevPosition })
  }

  /** Remove the overlay and restore the host's content visibility. */
  private unmountOverlay(host: HTMLElement): void {
    const state = this.overlays.get(host)
    if (!state) return
    state.overlay.remove()
    host.classList.remove(CLASS.svgHidden)
    host.style.position = state.prevPosition
    if (!host.getAttribute('style')) host.removeAttribute('style')
    this.overlays.delete(host)
  }

  /** Whether an overlay is currently mounted on the host. */
  hasOverlay(host: HTMLElement): boolean {
    return this.overlays.has(host)
  }

  /** Aggregate, display-facing snapshot for the store stats / DevTools. */
  snapshot(boneCount: number): {
    animationTier: SkeletonAnimationTier
    score: number
    fps: number
    memoryMB: number
    cacheHits: number
    cacheMisses: number
    degraded: boolean
    timings: SkeletonStageTimings
  } {
    const s = this.signals(boneCount)
    const last = this.lastResult
    const cache = this.cache.stats
    return {
      animationTier: last?.animationTier ?? this.micro.tier,
      score: s.score,
      fps: s.fps,
      memoryMB: s.memoryMB,
      cacheHits: cache.hits,
      cacheMisses: cache.misses,
      degraded: last ? (last.animationTier !== 'full' || !last.shimmer) : false,
      timings: last?.timings ?? { ...EMPTY_TIMINGS },
    }
  }

  /** Tear down the overlay mounted on a host and forget its cache key. */
  teardownHost(host: HTMLElement, id: number): void {
    this.unmountOverlay(host)
    this.hostKey.delete(id)
    this.bottleneck.forget(id)
  }

  /** Invalidate a host's cached blueprint so the next scan rebuilds it. */
  invalidateHost(id: number): void {
    const key = this.hostKey.get(id)
    if (key) this.cache.invalidate(key)
  }

  /** The animation preset name to apply for a tier (CSS layer). */
  animationFor(tier: SkeletonAnimationTier, base: string): string {
    return tierToAnimation(tier, base)
  }

  /** Stop sampling and release worker/loop resources. */
  dispose(): void {
    this.fps.stop()
    this.offthread.dispose()
    this.hostKey.clear()
  }

  /** Empty timings constant (for hosts that never rendered). */
  static get emptyTimings(): SkeletonStageTimings {
    return { ...EMPTY_TIMINGS }
  }

  /** Empty blueprint constant (for the initial `scan()` return). */
  static get emptyBlueprint(): SvgBlueprint {
    return { ...EMPTY_BLUEPRINT }
  }
}
