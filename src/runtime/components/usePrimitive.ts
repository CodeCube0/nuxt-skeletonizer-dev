import { computed, inject, type ComputedRef } from 'vue'
import type { SkeletonAnimation } from '../../types'
import { SKELETON_SCOPE_KEY } from '../state'
import { useSkeletonStore } from '../utils'

/**
 * Loading + animation props shared by every manual `Skeleton*` primitive.
 *
 * A primitive shows its bone(s) while {@link PrimitiveLoadingProps.loading} is
 * truthy and renders its default slot (the real content) otherwise. `isLoading`
 * and `showSkeleton` are accepted as aliases so the API reads naturally however
 * a caller models loading state.
 */
export interface PrimitiveLoadingProps {
  /** Show the skeleton bone(s) while true; render the slot (real content) when false. */
  loading?: boolean
  /** Alias for {@link PrimitiveLoadingProps.loading}. */
  isLoading?: boolean
  /** Alias for {@link PrimitiveLoadingProps.loading}. */
  showSkeleton?: boolean
  /** Animation preset override. */
  animation?: SkeletonAnimation
  /** Whether the shimmer/animation runs. */
  shimmer?: boolean
}

export interface UsePrimitiveResult {
  /** Whether the bone(s) should be rendered (vs. the real-content slot). */
  loading: ComputedRef<boolean>
  /** The resolved animation preset (`'none'` when shimmer is off). */
  anim: ComputedRef<SkeletonAnimation>
}

/**
 * Resolve the unified loading + animation state for a `Skeleton*` primitive.
 *
 * Loading precedence: explicit `loading` / `isLoading` / `showSkeleton` prop →
 * the nearest enclosing `<Skeletonizer>` scope → `true` (a standalone primitive
 * is a placeholder, so it defaults to showing its bone). This lets a primitive
 * dropped inside a `<Skeletonizer>` follow that scope's toggle automatically,
 * while a bare primitive keeps its "always a skeleton" behaviour.
 */
export function usePrimitive(props: PrimitiveLoadingProps): UsePrimitiveResult {
  const store = useSkeletonStore()
  const scope = inject(SKELETON_SCOPE_KEY, null)

  const loading = computed<boolean>(() => {
    if (props.loading !== undefined) return props.loading
    if (props.isLoading !== undefined) return props.isLoading
    if (props.showSkeleton !== undefined) return props.showSkeleton
    if (scope) return scope.value
    return true
  })

  const anim = computed<SkeletonAnimation>(() => {
    const shimmer = props.shimmer ?? store?.config.shimmer ?? true
    if (!shimmer) return 'none'
    return props.animation ?? store?.config.animation ?? 'wave'
  })

  return { loading, anim }
}
