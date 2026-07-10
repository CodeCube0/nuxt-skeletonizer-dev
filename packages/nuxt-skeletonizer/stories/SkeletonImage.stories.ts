import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SkeletonImage from '../src/runtime/components/SkeletonImage.vue'
import { boxDecorator, customThemeDecorator, darkDecorator, responsiveDecorator, svgBlueprintStory } from './_shared'

const meta: Meta<typeof SkeletonImage> = {
  title: 'Primitives/SkeletonImage',
  component: SkeletonImage,
  decorators: [boxDecorator],
  args: { aspectRatio: '16 / 9' },
}
export default meta
type Story = StoryObj<typeof SkeletonImage>

export const Basic: Story = {}
export const DarkMode: Story = { decorators: [darkDecorator] }
export const Responsive: Story = { decorators: [responsiveDecorator] }
export const Loading: Story = { args: { animation: 'pulse' } }
export const CustomTheme: Story = { decorators: [customThemeDecorator] }

/** Inspect the raw `<svg>` overlay — the image bone renders as a single `<rect>`. */
export const Blueprint: Story = svgBlueprintStory(SkeletonImage, { aspectRatio: '16 / 9' })
