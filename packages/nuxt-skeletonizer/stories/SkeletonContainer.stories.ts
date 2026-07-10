import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SkeletonBlock from '../src/runtime/components/SkeletonBlock.vue'
import SkeletonContainer from '../src/runtime/components/SkeletonContainer.vue'
import { customThemeDecorator, darkDecorator, formatSvg, responsiveDecorator } from './_shared'
import { nextTick, ref } from 'vue'

const meta: Meta<typeof SkeletonContainer> = {
  title: 'Composite/SkeletonContainer',
  component: SkeletonContainer,
  args: { layout: 'flex', gap: 12 },
  render: args => ({
    components: { SkeletonContainer, SkeletonBlock },
    setup: () => ({ args }),
    template: `
      <SkeletonContainer v-bind="args" style="width:420px">
        <SkeletonBlock :width="120" :height="80" />
        <SkeletonBlock :width="120" :height="80" />
        <SkeletonBlock :width="120" :height="80" />
      </SkeletonContainer>
    `,
  }),
}
export default meta
type Story = StoryObj<typeof SkeletonContainer>

export const Basic: Story = {}
export const DarkMode: Story = { decorators: [darkDecorator] }
export const Responsive: Story = { decorators: [responsiveDecorator], args: { direction: 'column' } }
export const Loading: Story = { args: { layout: 'grid', columns: 3 } }
export const CustomTheme: Story = { decorators: [customThemeDecorator] }

/**
 * Inspect the raw `<svg>` overlays — the container is a plain layout box and each
 * child `<SkeletonBlock>` renders its own `<svg>` `<rect>` bone.
 */
export const Blueprint: Story = {
  render: () => ({
    components: { SkeletonContainer, SkeletonBlock },
    setup() {
      const host = ref<HTMLElement | null>(null)
      const source = ref('')
      const sync = async () => {
        await nextTick()
        const svgs = Array.from(host.value?.querySelectorAll('svg') ?? [])
        source.value = svgs.length
          ? svgs.map((s, i) => `<!-- bone ${i + 1} -->\n${formatSvg(s.outerHTML)}`).join('\n\n')
          : '<!-- no <svg> rendered -->'
      }
      return { host, source, sync }
    },
    mounted() {
      // @ts-expect-error — runtime ref on the instance
      this.sync()
    },
    template: `
      <div style="display:flex;flex-direction:column;gap:14px;width:460px">
        <div ref="host">
          <SkeletonContainer layout="flex" :gap="12" style="width:420px">
            <SkeletonBlock :width="120" :height="80" />
            <SkeletonBlock :width="120" :height="80" />
            <SkeletonBlock :width="120" :height="80" />
          </SkeletonContainer>
        </div>
        <pre style="margin:0;padding:12px;border-radius:8px;background:#0b0b0b;color:#e5e7eb;font-size:11px;line-height:1.5;overflow:auto;max-height:320px">{{ source }}</pre>
      </div>
    `,
  }),
}
