import vue from '@vitejs/plugin-vue'
import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(ts|js)'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  addons: [],
  viteFinal: async (viteConfig) => {
    viteConfig.plugins = viteConfig.plugins ?? []
    // Ensure single-file components are compiled (Storybook's rolldown-vite
    // build does not pick up our package's .vue files otherwise).
    viteConfig.plugins.push(vue())
    return viteConfig
  },
}

export default config
