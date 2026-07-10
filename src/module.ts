import {
  addComponent,
  addImports,
  addPlugin,
  createResolver,
  defineNuxtModule,
} from '@nuxt/kit'
import { defu } from 'defu'
import type { SkeletonizerModuleOptions, SkeletonizerOptions } from './types'

export type {
  LayoutFingerprint,
  ScannedNode,
  SkeletonAnimation,
  SkeletonAnimationDefinition,
  SkeletonAnimationTier,
  SkeletonBoneKind,
  SkeletonCacheMode,
  SkeletonExplainEntry,
  SkeletonizerModuleOptions,
  SkeletonizerOptions,
  SkeletonizerStats,
  SkeletonRect,
  SkeletonRenderMode,
  SkeletonRuntimeSignals,
  SkeletonStageTimings,
  SkeletonThemeTokens,
  SvgBlueprint,
  SvgRendererOptions,
} from './types'

const COMPONENTS = [
  'Skeletonizer',
  'SkeletonBlock',
  'SkeletonText',
  'SkeletonAvatar',
  'SkeletonImage',
  'SkeletonButton',
  'SkeletonCard',
  'SkeletonContainer',
  'SkeletonList',
  'SkeletonTable',
] as const

export const defaults: SkeletonizerOptions = {
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

  // SVG renderer — the only backend.
  renderMode: 'svg',
  svgPrecision: 1,
  svgSharedGradient: true,

  // Adaptive / telemetry. All conservative (off) so the engine stays a pure
  // SVG painter unless these are explicitly enabled.
  adaptive: false,
  minFps: 45,
  telemetry: false,
  offThread: false,
  layoutCache: false,
  explain: false,
}

export default defineNuxtModule<SkeletonizerModuleOptions>({
  meta: {
    name: 'nuxt-skeletonizer',
    configKey: 'skeletonizer',
    compatibility: {
      nuxt: '>=3.10.0',
    },
  },
  defaults,
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Merge user options over defaults. `defu` keeps nested theme objects sane.
    const config = defu(options, defaults) as SkeletonizerOptions

    // Expose to the client via public runtime config so the plugin and
    // composable can read the resolved configuration at runtime. This also
    // lets users override values per-environment without rebuilding.
    nuxt.options.runtimeConfig.public.skeletonizer = defu(
      nuxt.options.runtimeConfig.public.skeletonizer as Partial<SkeletonizerOptions>,
      config,
    ) as SkeletonizerOptions

    // Transpile the runtime directory so the module works across bundlers and
    // in Nitro (SSR). Required for Vue SFCs shipped in the package.
    nuxt.options.build.transpile.push(resolver.resolve('./runtime'))

    // Inject the core stylesheet (CSS variables + animation keyframes).
    nuxt.options.css.push(resolver.resolve('./runtime/css/skeletonizer.css'))

    // Register the runtime plugin (provides state, directives, theme sync).
    addPlugin({
      src: resolver.resolve('./runtime/plugin'),
      mode: 'all',
    })

    // Auto-import the composable on both client and server.
    addImports({
      name: 'useSkeletonizer',
      as: 'useSkeletonizer',
      from: resolver.resolve('./runtime/composables/useSkeletonizer'),
    })

    // Advanced performance / DevTools composable.
    addImports({
      name: 'useSkeletonPerformance',
      as: 'useSkeletonPerformance',
      from: resolver.resolve('./runtime/composables/useSkeletonPerformance'),
    })

    // Auto-import the skeleton-aware data composables.
    const dataComposables = resolver.resolve('./runtime/composables/useSkeletonData')
    for (const name of [
      'useSkeletonFetch',
      'useSkeletonLazyFetch',
      'useSkeletonAsyncData',
      'useSkeletonLazyAsyncData',
    ]) {
      addImports({ name, as: name, from: dataComposables })
    }

    // Auto-register every component as a global, tree-shakeable component.
    for (const name of COMPONENTS) {
      addComponent({
        name,
        filePath: resolver.resolve(`./runtime/components/${name}.vue`),
        mode: 'all',
      })
    }

    // DevTools integration — dependency-free via the public hook. The hook is
    // only declared by `@nuxt/devtools`, so it is typed loosely here to avoid a
    // hard dependency on the (currently pre-release for v4) devtools-kit types.
    const onCustomTabs = nuxt.hook as unknown as (
      name: string,
      cb: (tabs: Array<Record<string, unknown>>) => void,
    ) => void
    onCustomTabs('devtools:customTabs', (tabs) => {
      tabs.push({
        name: 'skeletonizer',
        title: 'Skeletonizer',
        icon: 'carbon:skeleton-3d',
        category: 'modules',
        view: {
          type: 'iframe',
          src: '/__skeletonizer_devtools__',
        },
      })
    })

    // Surface the resolved config to other modules / build-time consumers.
    ;(nuxt.options.appConfig as Record<string, unknown>).skeletonizer = config

    if (config.debug) {
      console.info('[nuxt-skeletonizer] resolved config:', config)
    }
  },
})
