<script setup lang="ts">
import { computed } from 'vue'
import { cssSize } from '../utils'

defineOptions({ name: 'SkeletonContainer' })

/**
 * A layout primitive for arranging skeleton bones in a flex or grid. It owns
 * no engine logic — it simply preserves spacing so composed skeletons line up
 * with the real layout they stand in for.
 */
const props = withDefaults(
  defineProps<{
    /** Layout mode. */
    layout?: 'flex' | 'grid'
    /** Flex direction (when `layout` is `flex`). */
    direction?: 'row' | 'column'
    /** Number of columns (when `layout` is `grid`). */
    columns?: number
    /** Gap between children. */
    gap?: string | number
    /** Wrap flex children. */
    wrap?: boolean
    /** align-items value. */
    align?: string
    /** justify-content value. */
    justify?: string
    /** Wrapper width. */
    width?: string | number
  }>(),
  {
    layout: 'flex',
    direction: 'row',
    columns: 2,
    gap: '1rem',
    wrap: false,
    align: 'stretch',
    justify: 'flex-start',
    width: '100%',
  },
)

const style = computed(() => {
  const base = {
    gap: cssSize(props.gap),
    width: cssSize(props.width),
    alignItems: props.align,
    justifyContent: props.justify,
  }
  if (props.layout === 'grid') {
    return {
      ...base,
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.max(1, props.columns)}, 1fr)`,
    }
  }
  return {
    ...base,
    display: 'flex',
    flexDirection: props.direction,
    flexWrap: props.wrap ? ('wrap' as const) : ('nowrap' as const),
  }
})
</script>

<template>
  <div class="sk-container" :style="style" aria-hidden="true">
    <slot />
  </div>
</template>
