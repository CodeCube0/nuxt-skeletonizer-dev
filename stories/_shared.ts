import type { Component } from 'vue'
import type { Decorator, StoryObj } from '@storybook/vue3-vite'
import { h, nextTick, ref } from 'vue'

/**
 * Bilingual (English + Italiano) Storybook docs description. Keeps the
 * component documentation localized in both project languages; pass it to a
 * story's `parameters.docs.description.{component,story}`. Extend with more
 * locales the same way the docs site does.
 */
export function bilingual(en: string, it: string): string {
  return `${en}\n\n---\n\n🇮🇹 **Italiano** — ${it}`
}

/** Wrap a story in a dark container so dark-mode tokens apply. */
export const darkDecorator: Decorator = story =>
  h(
    'div',
    { class: 'dark', style: 'background:#0b0b0b;padding:24px;border-radius:12px;width:360px' },
    [h(story)],
  )

/** Render the story at two widths to demonstrate responsive layout. */
export const responsiveDecorator: Decorator = story =>
  h('div', { style: 'display:flex;flex-direction:column;gap:20px' }, [
    h('div', { style: 'width:240px;outline:1px dashed #cbd5e1;padding:12px' }, [h(story)]),
    h('div', { style: 'width:480px;outline:1px dashed #cbd5e1;padding:12px' }, [h(story)]),
  ])

/** Apply a custom amber theme via CSS variables. */
export const customThemeDecorator: Decorator = story =>
  h(
    'div',
    {
      style:
        '--sk-base-color:#fde68a;--sk-highlight-color:#fffbeb;--sk-radius:10px;width:360px;padding:8px',
    },
    [h(story)],
  )

/** A small box so primitives have room to render. */
export const boxDecorator: Decorator = story =>
  h('div', { style: 'width:360px' }, [h(story)])

/**
 * Build a "SVG Blueprint" story for any `Skeleton*` primitive: it renders the
 * live component, then mirrors the raw markup of its first generated `<svg>`
 * overlay into a `<pre>` so you can inspect the `<rect>`/`<circle>` shapes the
 * SVG renderer emits. Pass the component and the args to render it with.
 */
export function svgBlueprintStory(component: Component, args: Record<string, unknown> = {}): StoryObj {
  return {
    parameters: {
      docs: {
        description: {
          story: bilingual(
            'Inspect the raw `<svg>` overlay this component renders — every bone is a `<rect>` '
            + '(avatars a `<circle>`) sharing one namespaced gradient.',
            'Ispeziona l’overlay `<svg>` grezzo reso da questo componente — ogni osso è un `<rect>` '
            + '(gli avatar un `<circle>`) che condivide un gradiente con namespace.',
          ),
        },
      },
    },
    render: () => ({
      components: { Live: component },
      setup() {
        const host = ref<HTMLElement | null>(null)
        const source = ref('')
        const sync = async () => {
          await nextTick()
          const svg = host.value?.querySelector('svg')
          source.value = svg ? formatSvg(svg.outerHTML) : '<!-- no <svg> rendered -->'
        }
        return { host, source, sync, args }
      },
      mounted() {
        // @ts-expect-error — runtime ref on the instance
        this.sync()
      },
      template: `
        <div style="display:flex;flex-direction:column;gap:14px;width:420px">
          <div ref="host"><Live v-bind="args" /></div>
          <pre style="margin:0;padding:12px;border-radius:8px;background:#0b0b0b;color:#e5e7eb;font-size:11px;line-height:1.5;overflow:auto;max-height:320px">{{ source }}</pre>
        </div>
      `,
    }),
  }
}

/** Lightly pretty-print serialized SVG so the blueprint is readable. */
export function formatSvg(svg: string): string {
  return svg
    .replace(/></g, '>\n<')
    .replace(/<(rect|circle|stop|animate|animateTransform)\b/g, '  <$1')
}
