import { afterEach, describe, expect, it } from 'vitest'
import type { SkeletonizerOptions } from '../src/types'
import { applyBaseTheme, setThemeTokens, THEME_VARS } from '../src/runtime/theme/theme'

const defaults: SkeletonizerOptions = {
  enabled: true,
  autoScan: true,
  shimmer: true,
  shimmerDuration: 1200,
  animation: 'wave',
  baseColor: '#e5e7eb',
  highlightColor: '#f8fafc',
  darkBaseColor: '#2a2a2a',
  darkHighlightColor: '#3a3a3a',
  borderRadius: '0.375rem',
  opacity: 1,
  respectBorderRadius: true,
  debug: false,
  darkModeSelector: '.dark',
  scanDebounce: 50,
  maxScanDepth: 64,
}

describe('theme', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('style')
  })

  it('writes resolved config to :root as CSS variables', () => {
    applyBaseTheme(defaults)
    const root = document.documentElement
    expect(root.style.getPropertyValue(THEME_VARS.baseColor)).toBe(defaults.baseColor)
    expect(root.style.getPropertyValue(THEME_VARS.highlightColor)).toBe(defaults.highlightColor)
    expect(root.style.getPropertyValue(THEME_VARS.duration)).toBe(`${defaults.shimmerDuration}ms`)
    expect(root.style.getPropertyValue(THEME_VARS.opacity)).toBe(String(defaults.opacity))
  })

  it('applies token overrides globally', () => {
    setThemeTokens({ baseColor: '#111', highlightColor: '#222', borderRadius: '12px', opacity: 0.5 })
    const root = document.documentElement
    expect(root.style.getPropertyValue(THEME_VARS.baseColor)).toBe('#111')
    expect(root.style.getPropertyValue(THEME_VARS.highlightColor)).toBe('#222')
    expect(root.style.getPropertyValue(THEME_VARS.borderRadius)).toBe('12px')
    expect(root.style.getPropertyValue(THEME_VARS.opacity)).toBe('0.5')
  })

  it('applies token overrides to a scoped target element', () => {
    const el = document.createElement('div')
    setThemeTokens({ darkBaseColor: '#000', darkHighlightColor: '#444' }, el)
    expect(el.style.getPropertyValue(THEME_VARS.darkBaseColor)).toBe('#000')
    expect(el.style.getPropertyValue(THEME_VARS.darkHighlightColor)).toBe('#444')
    // Global root untouched.
    expect(document.documentElement.style.getPropertyValue(THEME_VARS.darkBaseColor)).toBe('')
  })
})
