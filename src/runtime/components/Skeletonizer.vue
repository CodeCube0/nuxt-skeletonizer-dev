<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  reactive,
  ref,
  watch,
} from 'vue'
import type {
  SkeletonAnimation,
  SkeletonThemeTokens,
} from '../../types'
import { CLASS } from '../constants'
import { DebouncedObserver } from '../engine/observer'
import {
  getActiveStore,
  SKELETON_SCOPE_KEY,
  SKELETONIZER_KEY,
  type HostController,
  type HostReport,
  type SkeletonizerStore,
} from '../state'
import { setThemeTokens } from '../theme/theme'

defineOptions({ name: 'Skeletonizer', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Scope override for the global enabled flag. */
    enabled?: boolean
    /** Animation preset for this scope (falls back to global config). */
    animation?: SkeletonAnimation
    /** Whether the shimmer/animation runs (falls back to global config). */
    shimmer?: boolean
    /** Run the automatic DOM-scan engine (falls back to global config). */
    autoScan?: boolean
    /** Scoped theme token overrides applied to this host only. */
    theme?: SkeletonThemeTokens
    /** Wrapper element tag. It hosts the absolutely-positioned SVG overlay. */
    tag?: string
  }>(),
  {
    enabled: undefined,
    animation: undefined,
    shimmer: undefined,
    autoScan: undefined,
    theme: undefined,
    tag: 'div',
  },
)

const store: SkeletonizerStore | null = inject(SKELETONIZER_KEY, null) ?? getActiveStore()

const root = ref<HTMLElement | null>(null)
let observer: DebouncedObserver | null = null
let controller: HostController | null = null

const lastResult = reactive<HostReport>({ bones: 0, ignored: 0, lastScanMs: 0 })

const active = computed<boolean>(() => {
  if (props.enabled !== undefined) return props.enabled
  return store ? store.isEnabled.value : false
})

// Expose this scope's effective state so nested manual primitives can follow it.
provide(SKELETON_SCOPE_KEY, active)

const effectiveAnimation = computed<SkeletonAnimation>(
  () => props.animation ?? store?.config.animation ?? 'wave',
)
const effectiveShimmer = computed<boolean>(
  () => props.shimmer ?? store?.config.shimmer ?? true,
)
const effectiveAutoScan = computed<boolean>(
  () => props.autoScan ?? store?.config.autoScan ?? true,
)

const hostClass = computed(() => [
  CLASS.host,
  { [CLASS.active]: active.value },
])

function report(): HostReport {
  return lastResult
}

function doScan(): void {
  if (!root.value || !store || !active.value) return
  observer?.pause()
  const result = store.engine.renderHost(root.value, {
    id: controller?.id ?? 0,
    label: props.tag ?? 'Skeletonizer',
    animation: effectiveAnimation.value,
    shimmer: effectiveShimmer.value,
  })
  Object.assign(lastResult, {
    bones: result.bones,
    ignored: result.ignored,
    lastScanMs: result.lastScanMs,
    animationTier: result.animationTier,
    shimmer: result.shimmer,
    fromCache: result.fromCache,
    timings: result.timings,
  })
  store._recompute()
}

function restore(): void {
  if (store && root.value) store.engine.teardownHost(root.value, controller?.id ?? 0)
  Object.assign(lastResult, { bones: 0, ignored: 0, lastScanMs: 0 })
  store?._recompute()
}

onMounted(() => {
  if (!root.value || !store) return

  if (props.theme) setThemeTokens(props.theme, root.value)

  observer = new DebouncedObserver(() => {
    if (active.value && effectiveAutoScan.value) {
      // The DOM changed for real — drop the cached blueprint so we re-measure.
      store.engine.invalidateHost(controller?.id ?? 0)
      doScan()
    }
  }, store.config.scanDebounce)

  controller = {
    id: store._nextId(),
    scan: doScan,
    restore,
    report,
  }
  store._register(controller)

  if (active.value) {
    nextTick(() => {
      doScan()
      if (effectiveAutoScan.value && root.value) observer?.observe(root.value)
    })
  }
})

// React to enabling/disabling for this scope.
watch(active, (isActive) => {
  if (!root.value) return
  if (isActive) {
    nextTick(() => {
      doScan()
      if (effectiveAutoScan.value && root.value) observer?.observe(root.value)
    })
  }
  else {
    observer?.disconnect()
    restore()
  }
})

// Re-apply scoped theme when it changes.
watch(
  () => props.theme,
  (theme) => {
    if (theme && root.value) setThemeTokens(theme, root.value)
  },
  { deep: true },
)

// Re-render when the animation/shimmer preset changes.
watch([effectiveAnimation, effectiveShimmer], () => {
  if (active.value) {
    store?.engine.invalidateHost(controller?.id ?? 0)
    nextTick(doScan)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  restore()
  if (controller) store?._unregister(controller)
})

defineExpose({ scan: doScan, restore, active })
</script>

<template>
  <component
    :is="props.tag"
    ref="root"
    :class="hostClass"
    :aria-busy="active || undefined"
    v-bind="$attrs"
  >
    <slot />
  </component>
</template>
