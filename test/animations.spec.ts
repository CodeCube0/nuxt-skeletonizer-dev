import { afterEach, describe, expect, it } from 'vitest'
import {
  __resetAnimations,
  animationClass,
  BUILTIN_ANIMATIONS,
  customAnimationNames,
  hasAnimation,
  registerAnimation,
} from '../src/runtime/animations'

describe('animations', () => {
  afterEach(() => __resetAnimations())

  it('knows the built-in presets', () => {
    for (const name of BUILTIN_ANIMATIONS) {
      expect(hasAnimation(name)).toBe(true)
    }
    expect(hasAnimation('does-not-exist')).toBe(false)
  })

  it('maps a name to its host class', () => {
    expect(animationClass('wave')).toBe('sk-anim-wave')
    expect(animationClass('custom-x')).toBe('sk-anim-custom-x')
  })

  it('registers a custom animation and injects its CSS once', () => {
    registerAnimation({
      name: 'flicker',
      css: '@keyframes sk-flicker { 50% { opacity: 0.2 } } .sk-anim-flicker .sk-bone { animation: sk-flicker 1s infinite }',
    })
    expect(hasAnimation('flicker')).toBe(true)
    expect(customAnimationNames()).toContain('flicker')

    const styleEl = document.getElementById('sk-custom-animations')
    expect(styleEl).not.toBeNull()
    expect(styleEl!.textContent).toContain('sk-flicker')
  })

  it('clears registered animations on reset', () => {
    registerAnimation({ name: 'temp', css: '.sk-anim-temp .sk-bone {}' })
    expect(hasAnimation('temp')).toBe(true)
    __resetAnimations()
    expect(hasAnimation('temp')).toBe(false)
    expect(document.getElementById('sk-custom-animations')).toBeNull()
  })
})
