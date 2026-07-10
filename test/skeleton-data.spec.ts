import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import {
  useSkeletonAsyncData,
  useSkeletonFetch,
  useSkeletonLazyAsyncData,
  useSkeletonLazyFetch,
} from '../src/runtime/composables/useSkeletonData'
import { createSkeletonizerStore, getActiveStore, setActiveStore } from '../src/runtime/state'
import { makeConfig } from './fixtures'
import { __lastResult, __resetResults } from './mocks/imports'

describe('skeleton-aware data composables', () => {
  beforeEach(() => {
    __resetResults()
    setActiveStore(createSkeletonizerStore(makeConfig({ enabled: false })))
  })

  it('turns skeleton on while pending and off when settled', async () => {
    const store = getActiveStore()!
    useSkeletonFetch('/api/users')
    expect(store.loadingCount.value).toBe(1)
    expect(store.isEnabled.value).toBe(true)

    __lastResult().status.value = 'success'
    await nextTick()
    expect(store.loadingCount.value).toBe(0)
    expect(store.isEnabled.value).toBe(false)
  })

  it('ref-counts concurrent requests', async () => {
    const store = getActiveStore()!
    useSkeletonFetch('/api/a')
    const first = __lastResult()
    useSkeletonLazyFetch('/api/b')
    const second = __lastResult()
    expect(store.loadingCount.value).toBe(2)

    first.status.value = 'success'
    await nextTick()
    expect(store.loadingCount.value).toBe(1)
    expect(store.isEnabled.value).toBe(true)

    second.status.value = 'error'
    await nextTick()
    expect(store.loadingCount.value).toBe(0)
    expect(store.isEnabled.value).toBe(false)
  })

  it('does nothing when skeleton: false', () => {
    const store = getActiveStore()!
    useSkeletonFetch('/api/users', { skeleton: false })
    expect(store.loadingCount.value).toBe(0)
  })

  it('supports useAsyncData with a trailing options object', () => {
    const store = getActiveStore()!
    useSkeletonAsyncData('key', () => Promise.resolve(1), { skeleton: true })
    expect(store.loadingCount.value).toBe(1)
  })

  it('supports useLazyAsyncData and honours skeleton: false', () => {
    const store = getActiveStore()!
    useSkeletonLazyAsyncData('a', () => Promise.resolve(1))
    expect(store.loadingCount.value).toBe(1)
    useSkeletonLazyAsyncData('b', () => Promise.resolve(2), { skeleton: false })
    expect(store.loadingCount.value).toBe(1)
  })

  it('does not throw without a store', () => {
    setActiveStore(null)
    expect(() => useSkeletonFetch('/api/users')).not.toThrow()
  })
})
