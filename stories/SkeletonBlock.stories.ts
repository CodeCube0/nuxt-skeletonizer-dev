import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SkeletonBlock from '../src/runtime/components/SkeletonBlock.vue'
import { boxDecorator, customThemeDecorator, darkDecorator, responsiveDecorator, svgBlueprintStory } from './_shared'

const meta: Meta<typeof SkeletonBlock> = {
  title: 'Primitives/SkeletonBlock',
  component: SkeletonBlock,
  decorators: [boxDecorator],
  args: { width: 200, height: 24 },
}
export default meta
type Story = StoryObj<typeof SkeletonBlock>

export const Basic: Story = {}
export const DarkMode: Story = { decorators: [darkDecorator] }
export const Responsive: Story = { decorators: [responsiveDecorator], args: { width: '100%' } }
export const Loading: Story = { args: { animation: 'pulse' } }
export const CustomTheme: Story = { decorators: [customThemeDecorator] }

/** Inspect the raw `<svg>` overlay — the block bone renders as a single `<rect>`. */
export const Blueprint: Story = svgBlueprintStory(SkeletonBlock, { width: 200, height: 24 })
