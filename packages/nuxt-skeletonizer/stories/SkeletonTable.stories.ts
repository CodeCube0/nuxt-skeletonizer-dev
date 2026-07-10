import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SkeletonTable from '../src/runtime/components/SkeletonTable.vue'
import { customThemeDecorator, darkDecorator, responsiveDecorator, svgBlueprintStory } from './_shared'
import { h } from 'vue'

const wide = (story: () => unknown) => h('div', { style: 'width:560px' }, [h(story as never)])

const meta: Meta<typeof SkeletonTable> = {
  title: 'Composite/SkeletonTable',
  component: SkeletonTable,
  decorators: [wide],
  args: { rows: 5, columns: 4, header: true },
}
export default meta
type Story = StoryObj<typeof SkeletonTable>

export const Basic: Story = {}
export const DarkMode: Story = { decorators: [darkDecorator] }
export const Responsive: Story = { decorators: [responsiveDecorator] }
export const Loading: Story = { args: { rows: 8, columns: 6, animation: 'pulse' } }
export const CustomTheme: Story = { decorators: [customThemeDecorator] }

/** Inspect the raw `<svg>` overlay — every header/body cell renders as a `<rect>`. */
export const Blueprint: Story = svgBlueprintStory(SkeletonTable, { rows: 5, columns: 4, header: true })
