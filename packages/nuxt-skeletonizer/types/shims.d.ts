/**
 * Ambient declarations so the runtime can be type-checked standalone (without
 * a prepared Nuxt app). In a real consumer app these symbols come from Nuxt's
 * generated `#imports` virtual module and Nuxt's `import.meta` augmentation.
 *
 * This file is intentionally a script (no top-level import/export) so the
 * `declare module '#imports'` below registers as an ambient module.
 */

interface ImportMeta {
  readonly client: boolean
  readonly server: boolean
}

declare module '#imports' {
  export function defineNuxtPlugin<T>(def: {
    name?: string
    enforce?: 'pre' | 'default' | 'post'
    setup: (nuxtApp: {
      vueApp: import('vue').App
      provide: (name: string, value: unknown) => void
      [key: string]: unknown
    }) => T
  }): unknown

  export function useRuntimeConfig(): {
    public: { skeletonizer: import('../src/types').SkeletonizerOptions }
  }

  // Loose stand-ins for Nuxt's data composables — the real generics come from
  // Nuxt in a consumer app. We only rely on the returned `status` ref here.
  interface AsyncDataLike {
    data: import('vue').Ref<unknown>
    status: import('vue').Ref<'idle' | 'pending' | 'success' | 'error'>
    pending: import('vue').Ref<boolean>
    error: import('vue').Ref<unknown>
    refresh: (...args: unknown[]) => Promise<void>
    execute: (...args: unknown[]) => Promise<void>
    [key: string]: unknown
  }
  export function useFetch(request: unknown, opts?: Record<string, unknown>): AsyncDataLike & Promise<AsyncDataLike>
  export function useLazyFetch(request: unknown, opts?: Record<string, unknown>): AsyncDataLike & Promise<AsyncDataLike>
  export function useAsyncData(...args: unknown[]): AsyncDataLike & Promise<AsyncDataLike>
  export function useLazyAsyncData(...args: unknown[]): AsyncDataLike & Promise<AsyncDataLike>
}
