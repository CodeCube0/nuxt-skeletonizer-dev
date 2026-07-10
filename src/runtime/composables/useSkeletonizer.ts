import { computed, inject, type ComputedRef } from 'vue'
import type {
  SkeletonAnimation,
  SkeletonAnimationDefinition,
  SkeletonizerOptions,
  SkeletonizerStats,
  SkeletonThemeTokens,
} from '../../types'
import type { SkeletonEngine } from '../engine/pipeline'
import { getActiveStore, SKELETONIZER_KEY, type ScanResult, type SkeletonizerStore } from '../state'

/**
 * Public surface of the composable. Mirrors the spec:
 *
 * ```ts
 * const s = useSkeletonizer()
 * s.enable(); s.disable(); s.toggle()
 * s.isEnabled; s.config
 * s.refresh(); s.scan()
 * ```
 */
export interface UseSkeletonizerReturn {
  /** Turn skeleton mode on globally. */
  enable: () => void
  /** Turn skeleton mode off globally. */
  disable: () => void
  /** Flip skeleton mode; returns the new state. */
  toggle: () => boolean
  /** Reactive, read-only enabled state. */
  isEnabled: ComputedRef<boolean>
  /** The resolved, reactive configuration (incl. read-only `renderMode: 'svg'`). */
  config: SkeletonizerOptions
  /** Re-scan all mounted hosts (rebuild the SVG overlays). */
  refresh: () => void
  /** Re-scan all hosts; returns `{ nodes, svg, cacheHit }` for the latest host. */
  scan: () => ScanResult
  /** Reactive runtime statistics. */
  stats: SkeletonizerStats
  /** Switch theme tokens at runtime. */
  setTheme: (tokens: SkeletonThemeTokens, target?: HTMLElement) => void
  /** Set the active animation preset. */
  setAnimation: (animation: SkeletonAnimation) => void
  /** Register a custom animation. */
  registerAnimation: (def: SkeletonAnimationDefinition) => void
  /** The per-app SVG/adaptive engine (advanced/DevTools access). */
  engine: SkeletonEngine
}

function resolveStore(): SkeletonizerStore {
  // Prefer the request-safe injected store (available in component setup),
  // then fall back to the app-level store registered by the plugin.
  const injected = inject(SKELETONIZER_KEY, null)
  const store = injected ?? getActiveStore()
  if (!store) {
    throw new Error(
      '[nuxt-skeletonizer] useSkeletonizer() was called before the plugin '
      + 'initialised. Ensure the module is registered in nuxt.config and that '
      + 'you call it within a component setup or Nuxt runtime context.',
    )
  }
  return store
}

/**
 * Access and control the skeletonizer. Works globally, per page, per component
 * and per container (any scope can call `enable`/`disable`/`refresh`).
 */
export function useSkeletonizer(): UseSkeletonizerReturn {
  const store = resolveStore()
  return {
    enable: store.enable,
    disable: store.disable,
    toggle: store.toggle,
    isEnabled: computed(() => store.isEnabled.value),
    config: store.config,
    refresh: store.refresh,
    scan: store.scan,
    stats: store.stats,
    setTheme: store.setTheme,
    setAnimation: store.setAnimation,
    registerAnimation: store.registerAnimation,
    engine: store.engine,
  }
}
