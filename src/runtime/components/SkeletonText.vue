<script setup lang="ts">
import { computed } from 'vue'
import { cssSize, pxSize, svgWidthValue } from '../utils'
import SkeletonSvg from './SkeletonSvg'
import { useSvgPrimitive, type PrimitiveLoadingProps, type SvgShape } from './useSvgPrimitive'

defineOptions({ name: 'SkeletonText' })

const props = withDefaults(
  defineProps<PrimitiveLoadingProps & {
    /** Number of text lines. */
    lines?: number
    /** Line height — number (px) or any CSS length. */
    lineHeight?: string | number
    /** Gap between lines. */
    gap?: string | number
    /** Width of the last line (shorter looks natural). */
    lastLineWidth?: string | number
    /** Width of the block. */
    width?: string | number
    /** Border radius of each line. */
    radius?: string | number
  }>(),
  {
    lines: 3,
    lineHeight: '0.85rem',
    gap: '0.55rem',
    lastLineWidth: '60%',
    width: '100%',
    radius: undefined,
    animation: undefined,
    shimmer: undefined,
    loading: undefined,
    isLoading: undefined,
    showSkeleton: undefined,
  },
)

const { loading, mode, gradId, fill, durSec } = useSvgPrimitive(props)

const count = computed(() => Math.max(1, Math.floor(props.lines)))
const lineH = computed(() => pxSize(props.lineHeight, 14))
const gapH = computed(() => pxSize(props.gap, 9))
const totalH = computed(() => count.value * lineH.value + (count.value - 1) * gapH.value)
const rx = computed(() => Math.min(4, Math.round(lineH.value / 3)))

const shapes = computed<SvgShape[]>(() => {
  const out: SvgShape[] = []
  for (let i = 0; i < count.value; i++) {
    const isLast = i === count.value - 1 && count.value > 1
    out.push({
      type: 'rect',
      x: 0,
      y: i * (lineH.value + gapH.value),
      w: isLast ? svgWidthValue(props.lastLineWidth) : '100%',
      h: lineH.value,
      rx: rx.value,
    })
  }
  return out
})
</script>

<template>
  <slot v-if="!loading" />
  <SkeletonSvg
    v-else
    :width="cssSize(props.width)"
    :height="totalH"
    :mode="mode"
    :grad-id="gradId"
    :fill="fill"
    :dur-sec="durSec"
    :shapes="shapes"
    :svg-style="{ display: 'block' }"
  />
</template>
