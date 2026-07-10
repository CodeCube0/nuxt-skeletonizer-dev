import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SkeletonText from '../src/runtime/components/SkeletonText.vue'
import { boxDecorator, customThemeDecorator, darkDecorator, responsiveDecorator, svgBlueprintStory } from './_shared'

const meta: Meta<typeof SkeletonText> = {
  title: 'Primitives/SkeletonText',
  component: SkeletonText,
  decorators: [boxDecorator],
  args: { lines: 3 },
}
export default meta
type Story = StoryObj<typeof SkeletonText>

export const Basic: Story = {}
export const DarkMode: Story = { decorators: [darkDecorator] }
export const Responsive: Story = { decorators: [responsiveDecorator] }
export const Loading: Story = { args: { lines: 5, animation: 'pulse' } }
export const CustomTheme: Story = { decorators: [customThemeDecorator] }

/** Inspect the raw `<svg>` overlay — each text line renders as a `<rect>`. */
export const Blueprint: Story = svgBlueprintStory(SkeletonText, { lines: 3 })
