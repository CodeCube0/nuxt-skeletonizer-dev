<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { cssSize, pxSize } from '../utils'
import SkeletonSvg from './SkeletonSvg'
import { useSvgPrimitive, type PrimitiveLoadingProps, type SvgShape } from './useSvgPrimitive'

defineOptions({ name: 'SkeletonImage' })

const props = withDefaults(
  defineProps<PrimitiveLoadingProps & {
    /** Width — number (px) or CSS length. */
    width?: string | number
    /** Height — number (px) or CSS length. Omit when using `aspectRatio`. */
    height?: string | number
    /** CSS aspect-ratio (e.g. `16/9`). Keeps layout when height is fluid. */
    aspectRatio?: string | number
    /** Border radius. */
    radius?: string | number
  }>(),
  {
    width: '100%',
    height: undefined,
    aspectRatio: '16 / 9',
    radius: '0.5rem',
    animation: undefined,
    shimmer: undefined,
    loading: undefined,
    isLoading: undefined,
    showSkeleton: undefined,
  },
)

const { loading, mode, gradId, fill, durSec } = useSvgPrimitive(props)

const shapes = computed<SvgShape[]>(() => [{ type: 'rect', rx: pxSize(props.radius, 8) }])

const svgStyle = computed<CSSProperties>(() =>
  props.height ? {} : { aspectRatio: String(props.aspectRatio) },
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
    :svg-style="svgStyle"
  />
</template>
