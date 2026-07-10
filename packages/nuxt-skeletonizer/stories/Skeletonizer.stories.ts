import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { nextTick, ref } from 'vue'
import Skeletonizer from '../src/runtime/components/Skeletonizer.vue'
import { useSkeletonPerformance } from '../src/runtime/composables/useSkeletonPerformance'
import { bilingual, customThemeDecorator, darkDecorator, formatSvg, responsiveDecorator } from './_shared'

const DEMO = `
  <div style="display:flex;gap:12px;align-items:center;width:340px">
    <img src="https://i.pravatar.cc/64?img=5" width="64" height="64" style="border-radius:9999px" alt="" />
    <div>
      <h3 style="margin:0;font-weight:600">Ada Lovelace</h3>
      <p style="margin:4px 0 0;color:#666">Principal engineer who loves skeletons that never shift the layout.</p>
      <button style="margin-top:6px;padding:4px 10px;border-radius:6px;border:1px solid #ddd">Follow</button>
    </div>
  </div>
`

const meta: Meta<typeof Skeletonizer> = {
  title: 'Skeletonizer',
  component: Skeletonizer,
  args: { enabled: true },
  render: args => ({
    components: { Skeletonizer },
    setup: () => ({ args }),
    template: `<Skeletonizer v-bind="args">${DEMO}</Skeletonizer>`,
  }),
}
export default meta
type Story = StoryObj<typeof Skeletonizer>

/** Automatic skeletonization of arbitrary markup. */
export const Basic: Story = {}

/** Toggle the control to compare real content vs. skeleton. */
export const Loading: Story = { args: { enabled: true } }

export const DarkMode: Story = { decorators: [darkDecorator] }
export const Responsive: Story = { decorators: [responsiveDecorator] }
export const CustomTheme: Story = {
  args: { theme: { baseColor: '#fde68a', highlightColor: '#fffbeb' } },
  decorators: [customThemeDecorator],
}

/**
 * The engine scans the wrapped markup and paints a single `<svg>` overlay — every
 * element becomes one `<rect>` (the avatar a `<circle>`) sharing one namespaced
 * shimmer gradient. This story prints that generated SVG blueprint.
 */
export const Blueprint: Story = {
  parameters: {
    docs: {
      description: {
        story: bilingual(
          'The whole subtree collapses into one `<svg>` overlay. The source below is the live '
          + 'blueprint via `useSkeletonPerformance().blueprint()`.',
          'L’intero sottoalbero collassa in un solo overlay `<svg>`. Il sorgente qui sotto è il '
          + 'blueprint dal vivo via `useSkeletonPerformance().blueprint()`.',
        ),
      },
    },
  },
  render: () => ({
    components: { Skeletonizer },
    setup() {
      const host = ref<HTMLElement | null>(null)
      const source = ref('')
      const perf = useSkeletonPerformance()
      const sync = async () => {
        // Let the host's post-mount scan run, then read the generated overlay.
        await nextTick()
        await new Promise(r => requestAnimationFrame(() => r(null)))
        const svg = perf.blueprint()?.svg ?? host.value?.querySelector('svg')?.outerHTML
        source.value = svg ? formatSvg(svg) : '<!-- no <svg> rendered yet -->'
      }
      return { host, source, sync, DEMO }
    },
    mounted() {
      // @ts-expect-error — runtime ref on the instance
      this.sync()
    },
    template: `
      <div style="display:flex;flex-direction:column;gap:14px;width:460px">
        <div ref="host"><Skeletonizer :enabled="true">${DEMO}</Skeletonizer></div>
        <pre style="margin:0;padding:12px;border-radius:8px;background:#0b0b0b;color:#e5e7eb;font-size:11px;line-height:1.5;overflow:auto;max-height:340px">{{ source }}</pre>
      </div>
    `,
  }),
}
