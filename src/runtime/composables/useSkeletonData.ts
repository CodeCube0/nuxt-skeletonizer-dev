import { useAsyncData, useFetch, useLazyAsyncData, useLazyFetch } from '#imports'
import { computed, inject, onScopeDispose, watch, type Ref } from 'vue'
import { getActiveStore, SKELETONIZER_KEY, type SkeletonizerStore } from '../state'

/**
 * Extra option accepted by the skeleton-aware data composables. When `skeleton`
 * is `true` (the default for these wrappers), the global skeleton turns on while
 * the request is pending and off when it settles — ref-counted so concurrent
 * requests compose correctly.
 */
export interface SkeletonDataExtra {
  skeleton?: boolean
}

type AsyncDataResult = ReturnType<typeof useFetch>

function resolveStore(): SkeletonizerStore | null {
  return inject(SKELETONIZER_KEY, null) ?? getActiveStore()
}

/**
 * Bind a `pending` boolean to the store's auto-loading counter. Increments on
 * the rising edge, decrements on the falling edge, and always releases its
 * count when the owning scope is disposed.
 */
function bindSkeleton(pending: Ref<boolean>): void {
  const store = resolveStore()
  if (!store) return
  let counted = false
  const release = (): void => {
    if (counted) {
      store.endLoading()
      counted = false
    }
  }
  watch(
    pending,
    (isPending) => {
      if (isPending && !counted) {
        store.beginLoading()
        counted = true
      }
      else if (!isPending) {
        release()
      }
    },
    { immediate: true },
  )
  onScopeDispose(release)
}

function withSkeleton<T extends AsyncDataResult>(result: T, skeleton: boolean): T {
  if (skeleton) {
    bindSkeleton(computed(() => result.status.value === 'pending'))
  }
  return result
}

function splitOptions(
  opts: (Record<string, unknown> & SkeletonDataExtra) | undefined,
): { skeleton: boolean, rest: Record<string, unknown> } {
  const { skeleton = true, ...rest } = opts ?? {}
  return { skeleton, rest }
}

/**
 * `useFetch` with skeleton support:
 *
 * ```ts
 * const { data } = await useSkeletonFetch('/api/users', { skeleton: true })
 * ```
 */
export function useSkeletonFetch(
  request: unknown,
  opts?: Record<string, unknown> & SkeletonDataExtra,
): AsyncDataResult {
  const { skeleton, rest } = splitOptions(opts)
  return withSkeleton(useFetch(request, rest), skeleton)
}

/** `useLazyFetch` with skeleton support. */
export function useSkeletonLazyFetch(
  request: unknown,
  opts?: Record<string, unknown> & SkeletonDataExtra,
): AsyncDataResult {
  const { skeleton, rest } = splitOptions(opts)
  return withSkeleton(useLazyFetch(request, rest), skeleton)
}

/** `useAsyncData` with skeleton support. */
export function useSkeletonAsyncData(
  ...args: [unknown, ...unknown[]]
): AsyncDataResult {
  const last = args[args.length - 1]
  let skeleton = true
  if (last && typeof last === 'object' && !Array.isArray(last) && 'skeleton' in last) {
    const opts = last as Record<string, unknown> & SkeletonDataExtra
    skeleton = opts.skeleton ?? true
    delete opts.skeleton
  }
  return withSkeleton(useAsyncData(...args), skeleton)
}

/** `useLazyAsyncData` with skeleton support. */
export function useSkeletonLazyAsyncData(
  ...args: [unknown, ...unknown[]]
): AsyncDataResult {
  const last = args[args.length - 1]
  let skeleton = true
  if (last && typeof last === 'object' && !Array.isArray(last) && 'skeleton' in last) {
    const opts = last as Record<string, unknown> & SkeletonDataExtra
    skeleton = opts.skeleton ?? true
    delete opts.skeleton
  }
  return withSkeleton(useLazyAsyncData(...args), skeleton)
}
