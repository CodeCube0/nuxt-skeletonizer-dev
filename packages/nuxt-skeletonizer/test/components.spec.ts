import { computed } from 'vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { SKELETON_SCOPE_KEY } from '../src/runtime/state'
import SkeletonAvatar from '../src/runtime/components/SkeletonAvatar.vue'
import SkeletonBlock from '../src/runtime/components/SkeletonBlock.vue'
import SkeletonButton from '../src/runtime/components/SkeletonButton.vue'
import SkeletonCard from '../src/runtime/components/SkeletonCard.vue'
import SkeletonContainer from '../src/runtime/components/SkeletonContainer.vue'
import SkeletonImage from '../src/runtime/components/SkeletonImage.vue'
import SkeletonList from '../src/runtime/components/SkeletonList.vue'
import SkeletonTable from '../src/runtime/components/SkeletonTable.vue'
import SkeletonText from '../src/runtime/components/SkeletonText.vue'

describe('SkeletonBlock', () => {
  it('renders a single <rect> inside an <svg> with sizing', () => {
    const w = mount(SkeletonBlock, { props: { width: 120, height: 20, radius: 4 } })
    const svg = w.find('svg.sk-svg')
    expect(svg.exists()).toBe(true)
    expect(svg.attributes('width')).toBe('120px')
    expect(svg.attributes('height')).toBe('20px')
    expect(w.findAll('rect')).toHaveLength(1)
    expect(w.find('rect').attributes('rx')).toBe('4')
  })

  it('renders a <circle> when asked', () => {
    const w = mount(SkeletonBlock, { props: { circle: true } })
    expect(w.find('circle').exists()).toBe(true)
    expect(w.findAll('rect')).toHaveLength(0)
  })

  it('selects the visual mode from animation + shimmer', () => {
    expect(mount(SkeletonBlock).find('.sk-svg--sweep').exists()).toBe(true)
    expect(mount(SkeletonBlock, { props: { shimmer: false } }).find('.sk-svg--none').exists()).toBe(true)
    expect(mount(SkeletonBlock, { props: { animation: 'pulse' } }).find('.sk-svg--pulse').exists()).toBe(true)
  })

  it('emits the animated gradient only when sweeping', () => {
    expect(mount(SkeletonBlock).find('animateTransform').exists()).toBe(true)
    expect(mount(SkeletonBlock, { props: { shimmer: false } }).find('linearGradient').exists()).toBe(false)
  })
})

describe('SkeletonText', () => {
  it('renders one rect per line with a shorter last line', () => {
    const w = mount(SkeletonText, { props: { lines: 4, lastLineWidth: '40%' } })
    const rects = w.findAll('rect')
    expect(rects).toHaveLength(4)
    expect(rects[3]!.attributes('width')).toBe('40%')
  })

  it('clamps to at least one line', () => {
    expect(mount(SkeletonText, { props: { lines: 0 } }).findAll('rect')).toHaveLength(1)
  })
})

describe('SkeletonAvatar', () => {
  it('renders a circular avatar', () => {
    const w = mount(SkeletonAvatar, { props: { size: 64 } })
    expect(w.find('svg').attributes('width')).toBe('64px')
    expect(w.find('circle').exists()).toBe(true)
  })

  it('renders a square avatar with a radius', () => {
    const w = mount(SkeletonAvatar, { props: { shape: 'square', radius: 8 } })
    expect(w.find('rect').attributes('rx')).toBe('8')
  })
})

describe('SkeletonImage', () => {
  it('uses aspect-ratio when no height is given', () => {
    const w = mount(SkeletonImage, { props: { aspectRatio: '4 / 3' } })
    expect(w.find('svg').attributes('style')).toContain('aspect-ratio: 4 / 3')
  })

  it('uses an explicit height over aspect-ratio', () => {
    const w = mount(SkeletonImage, { props: { height: 200 } })
    const svg = w.find('svg')
    expect(svg.attributes('height')).toBe('200px')
    expect(svg.attributes('style') ?? '').not.toContain('aspect-ratio')
  })
})

describe('SkeletonButton', () => {
  it('renders a button rect, full width when block', () => {
    expect(mount(SkeletonButton).find('rect').exists()).toBe(true)
    expect(mount(SkeletonButton, { props: { block: true } }).find('svg').attributes('width')).toBe('100%')
  })
})

describe('SkeletonCard', () => {
  it('renders media, avatar header and body lines as one svg', () => {
    const w = mount(SkeletonCard, { props: { media: true, avatar: true, lines: 3, footer: true } })
    expect(w.findAll('svg')).toHaveLength(1)
    expect(w.find('circle').exists()).toBe(true)
    // media(1) + title(2) + lines(3) + footer(1) = 7 rects.
    expect(w.findAll('rect')).toHaveLength(7)
  })

  it('omits media and avatar when disabled', () => {
    const w = mount(SkeletonCard, { props: { media: false, avatar: false, lines: 2, footer: false } })
    expect(w.find('circle').exists()).toBe(false)
    expect(w.findAll('rect')).toHaveLength(2)
  })
})

describe('SkeletonList', () => {
  it('renders rows with avatar circles and text rects', () => {
    const w = mount(SkeletonList, { props: { items: 3, avatar: true, lines: 2 } })
    expect(w.findAll('circle')).toHaveLength(3)
    expect(w.findAll('rect')).toHaveLength(6)
  })

  it('omits avatars when disabled', () => {
    const w = mount(SkeletonList, { props: { items: 2, avatar: false, lines: 1 } })
    expect(w.findAll('circle')).toHaveLength(0)
    expect(w.findAll('rect')).toHaveLength(2)
  })
})

describe('SkeletonTable', () => {
  it('renders header + body cells', () => {
    const w = mount(SkeletonTable, { props: { rows: 3, columns: 4, header: true } })
    expect(w.findAll('rect')).toHaveLength(16)
  })

  it('omits the header when disabled', () => {
    expect(mount(SkeletonTable, { props: { rows: 2, columns: 3, header: false } }).findAll('rect')).toHaveLength(6)
  })
})

describe('loading / real-content slot', () => {
  const all = { SkeletonBlock, SkeletonText, SkeletonAvatar, SkeletonImage, SkeletonButton, SkeletonCard, SkeletonList, SkeletonTable }

  it('renders a bone by default (standalone placeholder)', () => {
    for (const Comp of Object.values(all)) {
      const w = mount(Comp, { slots: { default: '<i class="real">x</i>' } })
      expect(w.find('.real').exists(), Comp.name).toBe(false)
    }
  })

  it('renders its real-content slot instead of bones when not loading', () => {
    for (const Comp of Object.values(all)) {
      const w = mount(Comp, { props: { loading: false }, slots: { default: '<i class="real">x</i>' } })
      expect(w.find('.real').exists(), Comp.name).toBe(true)
      expect(w.find('svg.sk-svg').exists(), Comp.name).toBe(false)
    }
  })

  it('accepts isLoading and showSkeleton aliases', () => {
    expect(mount(SkeletonBlock, { props: { isLoading: false }, slots: { default: '<i class="real" />' } }).find('.real').exists()).toBe(true)
    expect(mount(SkeletonBlock, { props: { showSkeleton: false }, slots: { default: '<i class="real" />' } }).find('.real').exists()).toBe(true)
  })

  it('follows an enclosing Skeletonizer scope when no prop is given', () => {
    const provideScope = (active: boolean) => ({
      global: { provide: { [SKELETON_SCOPE_KEY as symbol]: computed(() => active) } },
      slots: { default: '<i class="real">x</i>' },
    })
    const off = mount(SkeletonText, provideScope(false))
    expect(off.find('.real').exists()).toBe(true)
    expect(off.find('svg.sk-svg').exists()).toBe(false)

    const on = mount(SkeletonText, provideScope(true))
    expect(on.find('.real').exists()).toBe(false)
    expect(on.find('svg.sk-svg').exists()).toBe(true)
  })

  it('lets an explicit prop override the scope', () => {
    const w = mount(SkeletonText, {
      props: { loading: true },
      global: { provide: { [SKELETON_SCOPE_KEY as symbol]: computed(() => false) } },
      slots: { default: '<i class="real">x</i>' },
    })
    expect(w.find('svg.sk-svg').exists()).toBe(true)
  })
})

describe('SkeletonContainer', () => {
  it('renders a flex layout and its slotted content', () => {
    const w = mount(SkeletonContainer, {
      props: { layout: 'flex', direction: 'column', gap: 8 },
      slots: { default: '<span class="child">x</span>' },
    })
    const style = w.find('.sk-container').attributes('style')!
    expect(style).toContain('display: flex')
    expect(style).toContain('flex-direction: column')
    expect(w.find('.child').exists()).toBe(true)
  })

  it('renders a grid layout with the requested columns', () => {
    const w = mount(SkeletonContainer, { props: { layout: 'grid', columns: 3 } })
    const style = w.find('.sk-container').attributes('style')!
    expect(style).toContain('display: grid')
    expect(style).toContain('repeat(3, 1fr)')
  })
})
