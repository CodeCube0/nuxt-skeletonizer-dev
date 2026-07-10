import { describe, expect, it, vi } from 'vitest'
import { createSkeletonizerStore, type HostController } from '../src/runtime/state'
import { THEME_VARS } from '../src/runtime/theme/theme'
import { makeConfig } from './fixtures'

function fakeHost(id: number, report = { bones: 3, ignored: 1, lastScanMs: 5 }): HostController & { scanned: number } {
  return {
    id,
    scanned: 0,
    scan() {
      this.scanned++
    },
    restore: vi.fn(),
    report: () => report,
  }
}

describe('createSkeletonizerStore', () => {
  it('reflects initial enabled state from config', () => {
    expect(createSkeletonizerStore(makeConfig({ enabled: false })).isEnabled.value).toBe(false)
    expect(createSkeletonizerStore(makeConfig({ enabled: true })).isEnabled.value).toBe(true)
  })

  it('enable / disable / toggle drive the enabled flag and stats', () => {
    const store = createSkeletonizerStore(makeConfig({ enabled: false }))
    store.enable()
    expect(store.isEnabled.value).toBe(true)
    expect(store.stats.enabled).toBe(true)
    store.disable()
    expect(store.isEnabled.value).toBe(false)
    expect(store.toggle()).toBe(true)
    expect(store.toggle()).toBe(false)
  })

  it('registers hosts and aggregates stats', () => {
    const store = createSkeletonizerStore(makeConfig())
    const a = fakeHost(1)
    const b = fakeHost(2)
    store._register(a)
    store._register(b)
    expect(store.stats.hosts).toBe(2)
    expect(store.stats.bones).toBe(6)
    expect(store.stats.ignored).toBe(2)
    expect(store.stats.lastScanMs).toBe(5)

    store._unregister(a)
    expect(store.stats.hosts).toBe(1)
    expect(store.stats.bones).toBe(3)
  })

  it('refresh / scan re-scan every host and bump the scan counter', () => {
    const store = createSkeletonizerStore(makeConfig())
    const a = fakeHost(1)
    store._register(a)
    store.refresh()
    store.scan()
    expect(a.scanned).toBe(2)
    expect(store.stats.scans).toBe(2)
  })

  it('setTheme updates reactive config and CSS variables', () => {
    const store = createSkeletonizerStore(makeConfig())
    store.setTheme({ baseColor: '#abc', borderRadius: '9px', opacity: 0.7 })
    expect(store.config.baseColor).toBe('#abc')
    expect(store.config.borderRadius).toBe('9px')
    expect(store.config.opacity).toBe(0.7)
    expect(document.documentElement.style.getPropertyValue(THEME_VARS.baseColor)).toBe('#abc')
  })

  it('setTheme updates every theme token when provided', () => {
    const store = createSkeletonizerStore(makeConfig())
    store.setTheme({
      baseColor: '#1',
      highlightColor: '#2',
      darkBaseColor: '#3',
      darkHighlightColor: '#4',
      borderRadius: '5px',
      opacity: 0.3,
    })
    expect(store.config.baseColor).toBe('#1')
    expect(store.config.highlightColor).toBe('#2')
    expect(store.config.darkBaseColor).toBe('#3')
    expect(store.config.darkHighlightColor).toBe('#4')
    expect(store.config.borderRadius).toBe('5px')
    expect(store.config.opacity).toBe(0.3)
  })

  it('setTheme leaves untouched tokens alone', () => {
    const store = createSkeletonizerStore(makeConfig({ baseColor: '#keep' }))
    store.setTheme({ opacity: 0.9 })
    expect(store.config.baseColor).toBe('#keep')
    expect(store.config.opacity).toBe(0.9)
  })

  it('setAnimation updates the reactive config', () => {
    const store = createSkeletonizerStore(makeConfig())
    store.setAnimation('pulse')
    expect(store.config.animation).toBe('pulse')
  })

  it('registerAnimation injects CSS', () => {
    const store = createSkeletonizerStore(makeConfig())
    store.registerAnimation({ name: 'blip', css: '.sk-anim-blip .sk-bone {}' })
    expect(document.getElementById('sk-custom-animations')?.textContent).toContain('blip')
  })

  it('hands out monotonic host ids', () => {
    const store = createSkeletonizerStore(makeConfig())
    expect(store._nextId()).toBe(1)
    expect(store._nextId()).toBe(2)
  })
})
