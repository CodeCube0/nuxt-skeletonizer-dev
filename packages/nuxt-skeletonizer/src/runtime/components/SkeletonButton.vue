<script setup lang="ts">
import { computed } from 'vue'
import { cssSize, pxSize } from '../utils'
import SkeletonSvg from './SkeletonSvg'
import { useSvgPrimitive, type PrimitiveLoadingProps, type SvgShape } from './useSvgPrimitive'

defineOptions({ name: 'SkeletonButton' })

const props = withDefaults(
  defineProps<PrimitiveLoadingProps & {
    /** Width — number (px) or CSS length. */
    width?: string | number
    /** Height — number (px) or CSS length. */
    height?: string | number
    /** Border radius. */
    radius?: string | number
    /** Render a full-width button. */
    block?: boolean
  }>(),
  {
    width: 96,
    height: 38,
    radius: '0.5rem',
    block: false,
    animation: undefined,
    shimmer: undefined,
    loading: undefined,
    isLoading: undefined,
    showSkeleton: undefined,
  },
)

const { loading, mode, gradId, fill, durSec } = useSvgPrimitive(props)

const shapes = computed<SvgShape[]>(() => [{ type: 'rect', rx: pxSize(props.radius, 8) }])
</script>

<template>
  <slot v-if="!loading" />
  <SkeletonSvg
    v-else
    :width="props.block ? '100%' : cssSize(props.width)"
    :height="cssSize(props.height)"
    :mode="mode"
    :grad-id="gradId"
    :fill="fill"
    :dur-sec="durSec"
    :shapes="shapes"
  />
</template>
