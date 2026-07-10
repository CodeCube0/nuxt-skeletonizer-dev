/**
 * Stand-in for Nuxt's `#imports` virtual module so runtime files that import
 * Nuxt composables can be loaded in plain Vitest without a full Nuxt context.
 */
import { ref, type Ref } from 'vue'
import type { SkeletonizerOptions } from '../../src/types'

let runtimeConfig: { public: { skeletonizer: Partial<SkeletonizerOptions> } } = {
  public: { skeletonizer: {} },
}

export function __setRuntimeConfig(skeletonizer: Partial<SkeletonizerOptions>): void {
  runtimeConfig = { public: { skeletonizer } }
}

export function useRuntimeConfig() {
  return runtimeConfig
}

export function defineNuxtPlugin<T>(plugin: T): T {
  return plugin
}

// --- Mock data composables ------------------------------------------------

export interface MockAsyncData {
  data: Ref<unknown>
  status: Ref<'idle' | 'pending' | 'success' | 'error'>
  pending: Ref<boolean>
  error: Ref<unknown>
  refresh: () => Promise<void>
  execute: () => Promise<void>
}

const results: MockAsyncData[] = []

function makeResult(status: MockAsyncData['status']['value'] = 'pending'): MockAsyncData {
  const result: MockAsyncData = {
    data: ref(null),
    status: ref(status),
    pending: ref(status === 'pending'),
    error: ref(null),
    refresh: async () => {},
    execute: async () => {},
  }
  results.push(result)
  return result
}

/** The most recently created mock result (for tests to drive transitions). */
export function __lastResult(): MockAsyncData {
  return results[results.length - 1]!
}

export function __resetResults(): void {
  results.length = 0
}

export function useFetch(): MockAsyncData {
  return makeResult('pending')
}

export function useLazyFetch(): MockAsyncData {
  return makeResult('pending')
}

export function useAsyncData(): MockAsyncData {
  return makeResult('pending')
}

export function useLazyAsyncData(): MockAsyncData {
  return makeResult('pending')
}
