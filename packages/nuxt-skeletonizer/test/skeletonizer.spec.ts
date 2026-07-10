import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import Skeletonizer from '../src/runtime/components/Skeletonizer.vue'
import { createSkeletonizerStore, SKELETONIZER_KEY, type SkeletonizerStore } from '../src/runtime/state'
import { makeConfig } from './fixtures'

const SLOT = `
  <div class="card">
    <img src="/avatar.png">
    <h3>Jane Doe</h3>
    <p>Some profile description text</p>
    <button>Follow</button>
  </div>
`

function mountHost(store: SkeletonizerStore, props: Record<string, unknown> = {}) {
  return mount(Skeletonizer, {
    props,
    slots: { default: SLOT },
    attachTo: document.body,
    global: { provide: { [SKELETONIZER_KEY as symbol]: store } },
  })
}

describe('<Skeletonizer>', () => {
  it('injects an SVG overlay and hides the content after mount when enabled', async () => {
    const store = createSkeletonizerStore(makeConfig({ enabled: true }))
    const w = mountHost(store)
    await flushPromises()

    const hostEl = w.find('.sk-host')
    expect(hostEl.classes()).toContain('sk-active')
    expect(hostEl.classes()).toContain('sk-svg-hidden')
    expect(w.find('.sk-overlay svg').exists()).toBe(true)
    expect(store.stats.bones).toBe(4)
    expect(store.stats.renderMode).toBe('svg')
    w.unmount()
  })

  it('does not paint when disabled, and reacts to enabling at runtime', async () => {
    const store = createSkeletonizerStore(makeConfig({ enabled: false }))
    const w = mountHost(store)
    await flushPromises()
    expect(w.find('.sk-overlay').exists()).toBe(false)

    store.enable()
    await flushPromises()
    expect(w.find('.sk-overlay svg').exists()).toBe(true)

    store.disable()
    await flushPromises()
    expect(w.find('.sk-overlay').exists()).toBe(false)
    // Original content is untouched throughout.
    expect(w.find('img').attributes('src')).toBe('/avatar.png')
    expect(w.find('.sk-host').classes()).not.toContain('sk-svg-hidden')
    w.unmount()
  })

  it('honours a per-scope enabled prop over the global flag', async () => {
    const store = createSkeletonizerStore(makeConfig({ enabled: false }))
    const w = mountHost(store, { enabled: true })
    await flushPromises()
    expect(w.find('.sk-overlay svg').exists()).toBe(true)
    w.unmount()
  })

  it('applies a scoped animation and disables shimmer (static fill)', async () => {
    const store = createSkeletonizerStore(makeConfig({ enabled: true }))
    const w = mountHost(store, { animation: 'pulse', shimmer: false })
    await flushPromises()
    // shimmer:false → no gradient, static fill (sk-svg--none).
    expect(w.find('.sk-overlay .sk-svg--none').exists()).toBe(true)
    w.unmount()
  })

  it('applies a scoped theme to the host element', async () => {
    const store = createSkeletonizerStore(makeConfig({ enabled: true }))
    const w = mountHost(store, { theme: { baseColor: '#123456' } })
    await flushPromises()
    expect(w.find('.sk-host').attributes('style') ?? '').toContain('--sk-base-color: #123456')
    w.unmount()
  })

  it('restores the DOM and unregisters on unmount', async () => {
    const store = createSkeletonizerStore(makeConfig({ enabled: true }))
    const w = mountHost(store)
    await flushPromises()
    expect(store.stats.hosts).toBe(1)
    w.unmount()
    expect(store.stats.hosts).toBe(0)
  })

  it('renders content and stays inert without a store', async () => {
    const w = mount(Skeletonizer, { slots: { default: SLOT }, attachTo: document.body })
    await flushPromises()
    expect(w.find('.sk-overlay').exists()).toBe(false)
    expect(w.find('img').exists()).toBe(true)
    w.unmount()
  })

  it('scans once even when autoScan is false', async () => {
    const store = createSkeletonizerStore(makeConfig({ enabled: true }))
    const w = mountHost(store, { autoScan: false })
    await flushPromises()
    expect(store.stats.bones).toBe(4)
    w.unmount()
  })

  it('exposes scan/restore via template ref', async () => {
    const store = createSkeletonizerStore(makeConfig({ enabled: true }))
    const w = mountHost(store)
    await flushPromises()
    const vm = w.vm as unknown as { scan: () => void, restore: () => void }
    vm.restore()
    expect(w.find('.sk-overlay').exists()).toBe(false)
    vm.scan()
    expect(w.find('.sk-overlay svg').exists()).toBe(true)
    w.unmount()
  })

  it('store.scan() returns the latest blueprint info', async () => {
    const store = createSkeletonizerStore(makeConfig({ enabled: true }))
    const w = mountHost(store)
    await flushPromises()
    const result = store.scan()
    expect(result.svg).toContain('<svg')
    expect(typeof result.cacheHit).toBe('boolean')
    expect(store.stats.bones).toBe(4)
    w.unmount()
  })
})
