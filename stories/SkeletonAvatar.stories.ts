import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SkeletonAvatar from '../src/runtime/components/SkeletonAvatar.vue'
import { boxDecorator, customThemeDecorator, darkDecorator, responsiveDecorator, svgBlueprintStory } from './_shared'

const meta: Meta<typeof SkeletonAvatar> = {
  title: 'Primitives/SkeletonAvatar',
  component: SkeletonAvatar,
  decorators: [boxDecorator],
  args: { size: 56, shape: 'circle' },
}
export default meta
type Story = StoryObj<typeof SkeletonAvatar>

export const Basic: Story = {}
export const DarkMode: Story = { decorators: [darkDecorator] }
export const Responsive: Story = { decorators: [responsiveDecorator] }
export const Loading: Story = { args: { animation: 'pulse' } }
export const CustomTheme: Story = { decorators: [customThemeDecorator], args: { shape: 'square' } }

/** Inspect the raw `<svg>` overlay (avatar bones render as a `<circle>`). */
export const Blueprint: Story = svgBlueprintStory(SkeletonAvatar, { size: 56, shape: 'circle' })
