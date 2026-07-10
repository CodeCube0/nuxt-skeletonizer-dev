import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import type { SkeletonizerOptions } from '../types'
import { registerDirectives } from './directives'
import { createSkeletonizerStore, setActiveStore, SKELETONIZER_KEY } from './state'
import { applyBaseTheme } from './theme/theme'

/**
 * Runtime plugin. Creates one store per Nuxt app (request-safe on the server),
 * provides it to the component tree, registers the directives and syncs the
 * theme to CSS variables on the client.
 */
export default defineNuxtPlugin({
  name: 'nuxt-skeletonizer',
  // Run early so the store/directives exist before components mount.
  enforce: 'pre',
  setup(nuxtApp) {
    const config = useRuntimeConfig().public.skeletonizer as SkeletonizerOptions

    const store = createSkeletonizerStore(config)
    setActiveStore(store)

    // Provide through Vue's injection system (request-safe in component setup).
    nuxtApp.vueApp.provide(SKELETONIZER_KEY, store)
    registerDirectives(nuxtApp.vueApp)

    // Apply the resolved theme as CSS variables. No-ops on the server; runs on
    // the client after the app is created to avoid hydration mismatches.
    if (import.meta.client) {
      applyBaseTheme(config)
    }

    return {
      provide: {
        skeletonizer: store,
      },
    }
  },
})
