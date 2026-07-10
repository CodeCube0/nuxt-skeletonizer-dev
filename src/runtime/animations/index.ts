import type { SkeletonAnimationDefinition } from '../../types'

/** The built-in animation presets shipped in the core stylesheet. */
export const BUILTIN_ANIMATIONS = ['wave', 'pulse', 'fade', 'gradient', 'shine', 'none'] as const

const STYLE_ID = 'sk-custom-animations'
const registered = new Map<string, string>()

/** True only in a browser-like environment with a live document. */
function canTouchDom(): boolean {
  return typeof document !== 'undefined' && !!document.head
}

function styleEl(): HTMLStyleElement | null {
  if (!canTouchDom()) return null
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    document.head.appendChild(el)
  }
  return el
}

/**
 * Register a custom animation at runtime. The provided CSS (keyframes + rules)
 * is injected once; referencing `animation: '<name>'` then activates it. Rules
 * should be scoped under `.sk-anim-<name> .sk-bone` to match the host pattern.
 */
export function registerAnimation(def: SkeletonAnimationDefinition): void {
  registered.set(def.name, def.css)
  const el = styleEl()
  if (!el) return
  el.textContent = Array.from(registered.values()).join('\n')
}

/** Whether an animation name is known (built-in or registered). */
export function hasAnimation(name: string): boolean {
  return (BUILTIN_ANIMATIONS as readonly string[]).includes(name) || registered.has(name)
}

/** Names of all registered custom animations. */
export function customAnimationNames(): string[] {
  return Array.from(registered.keys())
}

/** The class that names a given animation preset, e.g. `sk-anim-wave`. */
export function animationClass(name: string): string {
  return `sk-anim-${name}`
}

/** Reset registered animations — used by tests. */
export function __resetAnimations(): void {
  registered.clear()
  const el = canTouchDom() ? document.getElementById(STYLE_ID) : null
  el?.remove()
}
