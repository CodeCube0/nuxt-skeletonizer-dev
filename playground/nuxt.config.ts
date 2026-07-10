import SkeletonizerModule from '../src/module'

export default defineNuxtConfig({
  modules: [SkeletonizerModule],
  devtools: { enabled: true },
  compatibilityDate: '2025-01-01',
  skeletonizer: {
    enabled: true,
    animation: 'wave',
  },
})
