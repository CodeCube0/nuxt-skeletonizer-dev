import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createSkeletonizerStore, setActiveStore, SKELETONIZER_KEY } from '../src/runtime/state'
import { cssSize, pxSize, svgWidthValue, useSkeletonStore } from '../src/runtime/utils'
import { makeConfig } from './fixtures'

describe('cssSize', () => {
  it('converts numbers to px and passes strings through', () => {
    expect(cssSize(12)).toBe('12px')
    expect(cssSize('2rem')).toBe('2rem')
    expect(cssSize('50%')).toBe('50%')
  })

  it('returns undefined for nullish values', () => {
    expect(cssSize(undefined)).toBeUndefined()
    expect(cssSize(null)).toBeUndefined()
  })
})

describe('pxSize', () => {
  it('resolves numbers, px and rem/em to pixels', () => {
    expect(pxSize(16)).toBe(16)
    expect(pxSize('24px')).toBe(24)
    expect(pxSize('2rem')).toBe(32)
    expect(pxSize('1.5em')).toBe(24)
  })

  it('falls back for percentages and unparseable values', () => {
    expect(pxSize('50%', 7)).toBe(7)
    expect(pxSize('auto', 5)).toBe(5)
    expect(pxSize(undefined, 3)).toBe(3)
    expect(pxSize(null, 0)).toBe(0)
  })
})

describe('svgWidthValue', () => {
  it('passes percentages through and renders numbers as px', () => {
    expect(svgWidthValue('60%')).toBe('60%')
    expect(svgWidthValue(120)).toBe('120px')
    expect(svgWidthValue(undefined)).toBe('100%')
    expect(svgWidthValue(undefined, '50%')).toBe('50%')
  })
})

describe('useSkeletonStore', () => {
  it('returns the injected store when present', () => {
    const store = createSkeletonizerStore(makeConfig())
    let resolved: unknown = 'unset'
    const Comp = defineComponent({
      setup() {
        resolved = useSkeletonStore()
        return () => h('div')
      },
    })
    mount(Comp, { global: { provide: { [SKELETONIZER_KEY as symbol]: store } } })
    expect(resolved).toBe(store)
  })

  it('falls back to the active store and returns null when none', () => {
    setActiveStore(null)
    expect(useSkeletonStore()).toBeNull()
    const store = createSkeletonizerStore(makeConfig())
    setActiveStore(store)
    expect(useSkeletonStore()).toBe(store)
    setActiveStore(null)
  })
})
