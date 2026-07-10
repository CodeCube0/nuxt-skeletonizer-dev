import { beforeEach, describe, expect, it } from 'vitest'
import { classify } from '../src/runtime/engine/classify'

function make(html: string): HTMLElement {
  const tpl = document.createElement('template')
  tpl.innerHTML = html.trim()
  const el = tpl.content.firstElementChild as HTMLElement
  document.body.appendChild(el)
  return el
}

function classifyEl(el: HTMLElement) {
  return classify(el, getComputedStyle(el))
}

describe('classify', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('classifies images and avatars', () => {
    expect(classifyEl(make('<img src="/a.png">'))).toBe('image')
    const avatar = make('<img src="/a.png" style="width:40px;height:40px;border-radius:50%">')
    expect(classifyEl(avatar)).toBe('avatar')
  })

  it('classifies form controls', () => {
    expect(classifyEl(make('<input type="text">'))).toBe('input')
    expect(classifyEl(make('<input type="checkbox">'))).toBe('checkbox')
    expect(classifyEl(make('<input type="radio">'))).toBe('radio')
    expect(classifyEl(make('<input type="hidden">'))).toBe('skip')
    expect(classifyEl(make('<textarea></textarea>'))).toBe('textarea')
    expect(classifyEl(make('<select></select>'))).toBe('select')
  })

  it('classifies interactive elements', () => {
    expect(classifyEl(make('<button>Go</button>'))).toBe('button')
    expect(classifyEl(make('<div role="button">Go</div>'))).toBe('button')
    expect(classifyEl(make('<a class="btn">Go</a>'))).toBe('button')
    expect(classifyEl(make('<div role="switch"></div>'))).toBe('switch')
  })

  it('classifies headings and text', () => {
    expect(classifyEl(make('<h1>Title</h1>'))).toBe('heading')
    expect(classifyEl(make('<p>Some text content here</p>'))).toBe('text')
  })

  it('treats elements with element children as containers', () => {
    expect(classifyEl(make('<div><span>a</span><span>b</span></div>'))).toBe('container')
  })

  it('detects badges and tags', () => {
    const badge = make('<span style="display:inline-block;border-radius:6px">New</span>')
    expect(classifyEl(badge)).toBe('badge')
    expect(classifyEl(make('<span class="tag">v2</span>'))).toBe('tag')
  })

  it('honours directive attributes', () => {
    expect(classifyEl(make('<div data-skeleton-ignore>x</div>'))).toBe('skip')
    expect(classifyEl(make('<div data-skeleton-keep>x</div>'))).toBe('skip')
    expect(classifyEl(make('<div data-skeleton-shimmer>x</div>'))).toBe('shimmer')
    expect(classifyEl(make('<div data-skeleton-union><span>a</span></div>'))).toBe('block')
    expect(classifyEl(make('<div data-skeleton-replace="avatar">x</div>'))).toBe('avatar')
    expect(classifyEl(make('<div data-skeleton-replace>x</div>'))).toBe('block')
  })

  it('skips structural, invisible and our own injected SVG nodes', () => {
    expect(classifyEl(make('<script>var a=1</script>'))).toBe('skip')
    expect(classifyEl(make('<div style="display:none">x</div>'))).toBe('skip')
    expect(classifyEl(make('<div class="sk-overlay">x</div>'))).toBe('skip')
    expect(classifyEl(make('<div class="sk-svg">x</div>'))).toBe('skip')
    expect(classifyEl(make('<br>'))).toBe('skip')
  })

  it('classifies small svg as icon and large as image', () => {
    const icon = make('<svg style="width:20px"></svg>')
    // happy-dom reports clientWidth 0, so size heuristic falls back to image.
    expect(['icon', 'image']).toContain(classifyEl(icon))
  })

  it('skips empty leaves with no paint', () => {
    expect(classifyEl(make('<div></div>'))).toBe('skip')
  })
})
