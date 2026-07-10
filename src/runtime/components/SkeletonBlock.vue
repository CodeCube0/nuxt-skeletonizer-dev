<script setup lang="ts">
import { computed } from 'vue'
import { cssSize, pxSize } from '../utils'
import SkeletonSvg from './SkeletonSvg'
import { useSvgPrimitive, type PrimitiveLoadingProps, type SvgShape } from './useSvgPrimitive'

defineOptions({ name: 'SkeletonBlock' })

const props = withDefaults(
  defineProps<PrimitiveLoadingProps & {
    /** Width — number (px) or any CSS length. */
    width?: string | number
    /** Height — number (px) or any CSS length. */
    height?: string | number
    /** Border radius — number (px) or any CSS length. */
    radius?: string | number
    /** Render as a circle (ignores `radius`). */
    circle?: boolean
    /** Retained for API compatibility (no longer affects the SVG output). */
    tag?: string
  }>(),
  {
    width: '100%',
    height: '1rem',
    radius: undefined,
    circle: false,
    tag: 'span',
    animation: undefined,
    shimmer: undefined,
    loading: undefined,
    isLoading: undefined,
    showSkeleton: undefined,
  },
)

const { loading, mode, gradId, fill, durSec } = useSvgPrimitive(props)

const shapes = computed<SvgShape[]>(() =>
  props.circle
    ? [{ type: 'circle' }]
    : [{ type: 'rect', rx: pxSize(props.radius, 6) }],
)
</script>

<template>
  <slot v-if="!loading" />
  <SkeletonSvg
    v-else
    :width="cssSize(props.width)"
    :height="cssSize(props.height)"
    :mode="mode"
    :grad-id="gradId"
    :fill="fill"
    :dur-sec="durSec"
    :shapes="shapes"
  />
</template>
