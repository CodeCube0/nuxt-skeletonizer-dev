import type { Preview } from '@storybook/vue3-vite'
import { setup } from '@storybook/vue3-vite'
import { registerDirectives } from '../src/runtime/directives'
import { createSkeletonizerStore, SKELETONIZER_KEY } from '../src/runtime/state'
import { applyBaseTheme } from '../src/runtime/theme/theme'
import type { SkeletonizerOptions } from '../src/types'
import '../src/runtime/css/skeletonizer.css'

const defaults: SkeletonizerOptions = {
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
}

// Provide a store + directives to every story so both the automatic engine and
// the manual primitives behave exactly as they do inside a Nuxt app.
const store = createSkeletonizerStore(defaults)

setup((app) => {
  app.provide(SKELETONIZER_KEY, store)
  registerDirectives(app)
  if (typeof document !== 'undefined') applyBaseTheme(defaults)
})

const preview: Preview = {
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0b0b0b' },
      ],
    },
    // Bilingual (English + Italiano) component docs, matching the docs site.
    docs: {
      description: {
        component:
          'Layout-preserving skeleton UI for Nuxt 4 — wrap any markup and it becomes an '
          + 'animated SVG overlay (bones as <rect>, avatars as <circle>) while loading, with '
          + 'zero layout shift. The "SVG Blueprint" story shows the raw generated <svg>.\n\n---\n\n'
          + '🇮🇹 **Italiano** — Skeleton UI che preserva il layout per Nuxt 4: avvolgi qualsiasi '
          + 'markup e diventa un overlay SVG animato (ossa come <rect>, avatar come <circle>) '
          + 'durante il caricamento, con zero spostamenti di layout. La story "SVG Blueprint" '
          + 'mostra l’<svg> grezzo generato.',
      },
    },
  },
}

export default preview
