<script setup lang="ts">
import { computed } from 'vue'
import { cssSize, pxSize } from '../utils'
import SkeletonSvg from './SkeletonSvg'
import { useSvgPrimitive, type PrimitiveLoadingProps, type SvgShape } from './useSvgPrimitive'

defineOptions({ name: 'SkeletonAvatar' })

const props = withDefaults(
  defineProps<PrimitiveLoadingProps & {
    /** Diameter / side length — number (px) or CSS length. */
    size?: string | number
    /** Shape. `circle` (default) or `square` (rounded). */
    shape?: 'circle' | 'square'
    /** Border radius when `shape` is `square`. */
    radius?: string | number
  }>(),
  {
    size: 40,
    shape: 'circle',
    radius: '0.5rem',
    animation: undefined,
    shimmer: undefined,
    loading: undefined,
    isLoading: undefined,
    showSkeleton: undefined,
  },
)

const { loading, mode, gradId, fill, durSec } = useSvgPrimitive(props)

const shapes = computed<SvgShape[]>(() =>
  props.shape === 'circle'
    ? [{ type: 'circle' }]
    : [{ type: 'rect', rx: pxSize(props.radius, 8) }],
)
</script>

<template>
  <slot v-if="!loading" />
  <SkeletonSvg
    v-else
    :width="cssSize(props.size)"
    :height="cssSize(props.size)"
    :mode="mode"
    :grad-id="gradId"
    :fill="fill"
    :dur-sec="durSec"
    :shapes="shapes"
    :svg-style="{ flex: '0 0 auto' }"
  />
</template>
