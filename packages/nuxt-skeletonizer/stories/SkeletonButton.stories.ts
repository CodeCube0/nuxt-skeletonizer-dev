import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SkeletonButton from '../src/runtime/components/SkeletonButton.vue'
import { boxDecorator, customThemeDecorator, darkDecorator, responsiveDecorator, svgBlueprintStory } from './_shared'

const meta: Meta<typeof SkeletonButton> = {
  title: 'Primitives/SkeletonButton',
  component: SkeletonButton,
  decorators: [boxDecorator],
  args: {},
}
export default meta
type Story = StoryObj<typeof SkeletonButton>

export const Basic: Story = {}
export const DarkMode: Story = { decorators: [darkDecorator] }
export const Responsive: Story = { decorators: [responsiveDecorator], args: { block: true } }
export const Loading: Story = { args: { animation: 'pulse' } }
export const CustomTheme: Story = { decorators: [customThemeDecorator] }

/** Inspect the raw `<svg>` overlay — the button bone renders as a single `<rect>`. */
export const Blueprint: Story = svgBlueprintStory(SkeletonButton, {})
