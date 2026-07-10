import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SkeletonCard from '../src/runtime/components/SkeletonCard.vue'
import { boxDecorator, customThemeDecorator, darkDecorator, responsiveDecorator, svgBlueprintStory } from './_shared'

const meta: Meta<typeof SkeletonCard> = {
  title: 'Composite/SkeletonCard',
  component: SkeletonCard,
  decorators: [boxDecorator],
  args: { media: true, avatar: true, lines: 3 },
}
export default meta
type Story = StoryObj<typeof SkeletonCard>

export const Basic: Story = {}
export const DarkMode: Story = { decorators: [darkDecorator] }
export const Responsive: Story = { decorators: [responsiveDecorator] }
export const Loading: Story = { args: { footer: true, animation: 'pulse' } }
export const CustomTheme: Story = { decorators: [customThemeDecorator] }

/** Inspect the raw `<svg>` overlay — media/avatar/lines as `<rect>`/`<circle>` shapes. */
export const Blueprint: Story = svgBlueprintStory(SkeletonCard, { media: true, avatar: true, lines: 3 })
