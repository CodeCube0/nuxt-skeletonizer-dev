import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { ATTR } from '../src/runtime/constants'
import { directives, registerDirectives } from '../src/runtime/directives'

function mountWith(template: string, data: Record<string, unknown> = {}) {
  const Comp = defineComponent({
    data: () => data,
    template,
  })
  return mount(Comp, {
    global: {
      directives: {
        'skeleton-ignore': directives['skeleton-ignore']!,
        'skeleton-keep': directives['skeleton-keep']!,
        'skeleton-replace': directives['skeleton-replace']!,
        'skeleton-union': directives['skeleton-union']!,
        'skeleton-shimmer': directives['skeleton-shimmer']!,
      },
    },
  })
}

describe('directives', () => {
  it('v-skeleton-ignore sets the ignore attribute', () => {
    const w = mountWith('<div v-skeleton-ignore>x</div>')
    expect(w.element.hasAttribute(ATTR.ignore)).toBe(true)
  })

  it('v-skeleton-keep sets the keep attribute', () => {
    const w = mountWith('<div v-skeleton-keep>x</div>')
    expect(w.element.hasAttribute(ATTR.keep)).toBe(true)
  })

  it('v-skeleton-replace stores the bone kind value', () => {
    const w = mountWith('<div v-skeleton-replace="\'avatar\'">x</div>')
    expect(w.element.getAttribute(ATTR.replace)).toBe('avatar')
  })

  it('v-skeleton-union sets the union attribute', () => {
    const w = mountWith('<div v-skeleton-union>x</div>')
    expect(w.element.hasAttribute(ATTR.union)).toBe(true)
  })

  it('v-skeleton-shimmer sets the shimmer attribute', () => {
    const w = mountWith('<div v-skeleton-shimmer>x</div>')
    expect(w.element.hasAttribute(ATTR.shimmer)).toBe(true)
  })

  it('removes the attribute when bound to false', () => {
    const w = mountWith('<div v-skeleton-ignore="flag">x</div>', { flag: false })
    expect(w.element.hasAttribute(ATTR.ignore)).toBe(false)
  })

  it('registerDirectives installs all five on an app', () => {
    const installed: string[] = []
    const fakeApp = {
      directive(name: string) {
        installed.push(name)
        return this
      },
    }
    registerDirectives(fakeApp as never)
    expect(installed).toEqual([
      'skeleton-ignore',
      'skeleton-keep',
      'skeleton-replace',
      'skeleton-union',
      'skeleton-shimmer',
    ])
  })
})
