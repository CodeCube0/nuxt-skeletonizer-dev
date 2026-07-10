<script setup lang="ts">
import { computed } from 'vue'
import { cssSize, pxSize } from '../utils'
import SkeletonSvg from './SkeletonSvg'
import { useSvgPrimitive, type PrimitiveLoadingProps, type SvgShape } from './useSvgPrimitive'

defineOptions({ name: 'SkeletonCard' })

const props = withDefaults(
  defineProps<PrimitiveLoadingProps & {
    /** Show a media image at the top of the card. */
    media?: boolean
    /** Show an avatar + title header row. */
    avatar?: boolean
    /** Show a footer action button. */
    footer?: boolean
    /** Number of body text lines. */
    lines?: number
    /** Card width. */
    width?: string | number
    /** Card padding. */
    padding?: string | number
    /** Card border radius (applied to the media banner). */
    radius?: string | number
  }>(),
  {
    media: true,
    avatar: true,
    footer: false,
    lines: 3,
    width: '100%',
    padding: '1rem',
    radius: '0.75rem',
    animation: undefined,
    shimmer: undefined,
    loading: undefined,
    isLoading: undefined,
    showSkeleton: undefined,
  },
)

const { loading, mode, gradId, fill, durSec } = useSvgPrimitive(props)

const MEDIA_H = 160
const AVATAR = 44
const LINE_H = 13
const LINE_GAP = 12
const GAP = 14

const pad = computed(() => pxSize(props.padding, 16))
const lineCount = computed(() => Math.max(1, Math.floor(props.lines)))

const layout = computed(() => {
  const shapes: SvgShape[] = []
  const mediaH = props.media ? MEDIA_H : 0
  if (props.media) {
    shapes.push({ type: 'rect', x: 0, y: 0, w: '100%', h: mediaH, rx: 0 })
  }
  const contentTop = mediaH + pad.value
  let afterHeader = contentTop
  if (props.avatar) {
    shapes.push({ type: 'circle', cx: pad.value + AVATAR / 2, cy: contentTop + AVATAR / 2, r: AVATAR / 2 })
    const tx = pad.value + AVATAR + 12
    shapes.push({ type: 'rect', x: tx, y: contentTop + 4, w: '55%', h: 12, rx: 3 })
    shapes.push({ type: 'rect', x: tx, y: contentTop + 24, w: '35%', h: 10, rx: 3 })
    afterHeader = contentTop + AVATAR + GAP
  }
  for (let i = 0; i < lineCount.value; i++) {
    const isLast = i === lineCount.value - 1
    shapes.push({
      type: 'rect',
      x: pad.value,
      y: afterHeader + i * (LINE_H + LINE_GAP),
      w: isLast ? '70%' : '90%',
      h: LINE_H,
      rx: 3,
    })
  }
  let bodyEnd = afterHeader + lineCount.value * LINE_H + (lineCount.value - 1) * LINE_GAP
  if (props.footer) {
    shapes.push({ type: 'rect', x: pad.value, y: bodyEnd + GAP, w: 96, h: 38, rx: 8 })
    bodyEnd += GAP + 38
  }
  return { shapes, totalH: bodyEnd + pad.value }
})

const shapes = computed<SvgShape[]>(() => layout.value.shapes)
const totalH = computed(() => layout.value.totalH)
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
