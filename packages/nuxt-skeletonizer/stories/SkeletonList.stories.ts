import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SkeletonList from '../src/runtime/components/SkeletonList.vue'
import { boxDecorator, customThemeDecorator, darkDecorator, responsiveDecorator, svgBlueprintStory } from './_shared'

const meta: Meta<typeof SkeletonList> = {
  title: 'Composite/SkeletonList',
  component: SkeletonList,
  decorators: [boxDecorator],
  args: { items: 4, lines: 2, avatar: true },
}
export default meta
type Story = StoryObj<typeof SkeletonList>

export const Basic: Story = {}
export const DarkMode: Story = { decorators: [darkDecorator] }
export const Responsive: Story = { decorators: [responsiveDecorator] }
export const Loading: Story = { args: { items: 6, animation: 'pulse' } }
export const CustomTheme: Story = { decorators: [customThemeDecorator] }

/** Inspect the raw `<svg>` overlay — avatars as `<circle>`, text lines as `<rect>`. */
export const Blueprint: Story = svgBlueprintStory(SkeletonList, { items: 4, lines: 2, avatar: true })
