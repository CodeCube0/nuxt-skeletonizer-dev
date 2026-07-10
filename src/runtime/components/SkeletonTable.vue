<script setup lang="ts">
import { computed } from 'vue'
import { pxSize } from '../utils'
import SkeletonSvg from './SkeletonSvg'
import { useSvgPrimitive, type PrimitiveLoadingProps, type SvgShape } from './useSvgPrimitive'

defineOptions({ name: 'SkeletonTable' })

const props = withDefaults(
  defineProps<PrimitiveLoadingProps & {
    /** Number of body rows. */
    rows?: number
    /** Number of columns. */
    columns?: number
    /** Render a header row. */
    header?: boolean
    /** Gap between rows (vertical). */
    gap?: string | number
    /** Height of a body cell. */
    cellHeight?: string | number
    /** Height of a header cell. */
    headerHeight?: string | number
  }>(),
  {
    rows: 5,
    columns: 4,
    header: true,
    gap: '0.75rem',
    cellHeight: '1rem',
    headerHeight: '1.1rem',
    animation: undefined,
    shimmer: undefined,
    loading: undefined,
    isLoading: undefined,
    showSkeleton: undefined,
  },
)

const { loading, mode, gradId, fill, durSec } = useSvgPrimitive(props)

const rowCount = computed(() => Math.max(1, Math.floor(props.rows)))
const colCount = computed(() => Math.max(1, Math.floor(props.columns)))
const cellH = computed(() => pxSize(props.cellHeight, 16))
const headerH = computed(() => pxSize(props.headerHeight, 18))
const rowGap = computed(() => pxSize(props.gap, 12))

const totalH = computed(() => {
  const headerBlock = props.header ? headerH.value + rowGap.value : 0
  return headerBlock + rowCount.value * cellH.value + (rowCount.value - 1) * rowGap.value
})

const shapes = computed<SvgShape[]>(() => {
  const out: SvgShape[] = []
  const colW = 100 / colCount.value
  let y = 0
  if (props.header) {
    for (let c = 0; c < colCount.value; c++) {
      out.push({ type: 'rect', x: `${c * colW}%`, y, w: `${colW * 0.7}%`, h: headerH.value, rx: 3 })
    }
    y += headerH.value + rowGap.value
  }
  for (let r = 0; r < rowCount.value; r++) {
    for (let c = 0; c < colCount.value; c++) {
      out.push({ type: 'rect', x: `${c * colW}%`, y, w: `${colW * 0.85}%`, h: cellH.value, rx: 3 })
    }
    y += cellH.value + rowGap.value
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
