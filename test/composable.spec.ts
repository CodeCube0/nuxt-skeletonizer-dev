import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useSkeletonizer } from '../src/runtime/composables/useSkeletonizer'
import { createSkeletonizerStore, setActiveStore, SKELETONIZER_KEY } from '../src/runtime/state'
import { makeConfig } from './fixtures'

describe('useSkeletonizer', () => {
  it('throws a helpful error when no store is available', () => {
    setActiveStore(null)
    expect(() => useSkeletonizer()).toThrowError(/plugin/i)
  })

  it('resolves the module-level fallback store', () => {
    const store = createSkeletonizerStore(makeConfig({ enabled: false }))
    setActiveStore(store)
    const s = useSkeletonizer()
    expect(s.isEnabled.value).toBe(false)
    s.enable()
    expect(s.isEnabled.value).toBe(true)
    setActiveStore(null)
  })

  it('prefers the injected store inside a component', () => {
    const store = createSkeletonizerStore(makeConfig({ enabled: true }))
    let api: ReturnType<typeof useSkeletonizer> | null = null

    const Comp = defineComponent({
      setup() {
        api = useSkeletonizer()
        return () => h('div')
      },
    })

    mount(Comp, { global: { provide: { [SKELETONIZER_KEY as symbol]: store } } })

    expect(api!.isEnabled.value).toBe(true)
    api!.toggle()
    expect(store.isEnabled.value).toBe(false)
    expect(api!.config.baseColor).toBe('#e5e7eb')
  })

  it('exposes the full documented surface', () => {
    setActiveStore(createSkeletonizerStore(makeConfig()))
    const s = useSkeletonizer()
    for (const key of ['enable', 'disable', 'toggle', 'refresh', 'scan', 'setTheme', 'setAnimation', 'registerAnimation'] as const) {
      expect(typeof s[key]).toBe('function')
    }
    expect(s.isEnabled.value).toBe(true)
    expect(s.stats.enabled).toBe(true)
    setActiveStore(null)
  })
})
