<script setup lang="ts">
import { computed } from 'vue'
import { pxSize } from '../utils'
import SkeletonSvg from './SkeletonSvg'
import { useSvgPrimitive, type PrimitiveLoadingProps, type SvgShape } from './useSvgPrimitive'

defineOptions({ name: 'SkeletonList' })

const props = withDefaults(
  defineProps<PrimitiveLoadingProps & {
    /** Number of list rows. */
    items?: number
    /** Show a leading avatar on each row. */
    avatar?: boolean
    /** Number of text lines per row. */
    lines?: number
    /** Gap between rows. */
    gap?: string | number
    /** Avatar size. */
    avatarSize?: string | number
  }>(),
  {
    items: 5,
    avatar: true,
    lines: 2,
    gap: '1rem',
    avatarSize: 40,
    animation: undefined,
    shimmer: undefined,
    loading: undefined,
    isLoading: undefined,
    showSkeleton: undefined,
  },
)

const { loading, mode, gradId, fill, durSec } = useSvgPrimitive(props)

const count = computed(() => Math.max(1, Math.floor(props.items)))
const lineCount = computed(() => Math.max(1, Math.floor(props.lines)))
const avatarPx = computed(() => pxSize(props.avatarSize, 40))
const rowGap = computed(() => pxSize(props.gap, 16))

const LINE_H = 13
const LINE_GAP = 8
const linesBlockH = computed(() => lineCount.value * LINE_H + (lineCount.value - 1) * LINE_GAP)
const rowH = computed(() => Math.max(props.avatar ? avatarPx.value : 0, linesBlockH.value))
const totalH = computed(() => count.value * rowH.value + (count.value - 1) * rowGap.value)

const shapes = computed<SvgShape[]>(() => {
  const out: SvgShape[] = []
  const textX = props.avatar ? avatarPx.value + 12 : 0
  for (let row = 0; row < count.value; row++) {
    const yBase = row * (rowH.value + rowGap.value)
    if (props.avatar) {
      out.push({ type: 'circle', cx: avatarPx.value / 2, cy: yBase + rowH.value / 2, r: avatarPx.value / 2 })
    }
    const linesTop = yBase + (rowH.value - linesBlockH.value) / 2
    for (let i = 0; i < lineCount.value; i++) {
      const isLast = i === lineCount.value - 1
      out.push({
        type: 'rect',
        x: textX,
        y: linesTop + i * (LINE_H + LINE_GAP),
        w: isLast ? '50%' : '85%',
        h: LINE_H,
        rx: 3,
      })
    }
  }
  return out
})
</script>

<template>
  <slot v-if="!loading" />
  <SkeletonSvg
    v-else
    width="100%"
    :height="totalH"
    :mode="mode"
    :grad-id="gradId"
    :fill="fill"
    :dur-sec="durSec"
    :shapes="shapes"
    :svg-style="{ display: 'block' }"
  />
</template>
