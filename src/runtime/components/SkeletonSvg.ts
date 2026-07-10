import { defineComponent, h, type CSSProperties, type PropType, type VNode } from 'vue'
import type { SvgShape, SvgVisualMode } from './useSvgPrimitive'

/**
 * Internal helper that renders one inline `<svg>` for the manual primitives:
 * the shared, namespaced shimmer gradient plus a list of `<rect>`/`<circle>`
 * shapes filled by it. Not a public component — imported directly by the
 * `Skeleton*` primitives so they all emit identical, SSR-safe SVG markup.
 *
 * Authored as a render function (rather than an SFC template) on purpose: the
 * SVG sub-tree is built with `h('svg', …)`, which Vue resolves into the SVG
 * namespace automatically. This sidesteps the template compiler entirely, so it
 * compiles identically across every bundler (Vite, Rollup and rolldown-vite —
 * the latter's template parser chokes on inline SVG).
 */
export default defineComponent({
  name: 'SkeletonSvgInternal',
  inheritAttrs: false,
  props: {
    width: { type: [String, Number] as PropType<string | number | undefined>, default: undefined },
    height: { type: [String, Number] as PropType<string | number | undefined>, default: undefined },
    mode: { type: String as PropType<SvgVisualMode>, required: true },
    gradId: { type: String, required: true },
    fill: { type: String, required: true },
    durSec: { type: String, required: true },
    shapes: { type: Array as PropType<SvgShape[]>, required: true },
    svgStyle: { type: Object as PropType<CSSProperties>, default: undefined },
  },
  setup(props, { attrs }) {
    return (): VNode => {
      const children: VNode[] = []

      // The shared, namespaced shimmer gradient (omitted in static mode).
      if (props.mode !== 'none') {
        const stops: VNode[] = [
          h('stop', { 'offset': '0%', 'stop-color': 'var(--sk-bg)' }),
          h('stop', { 'offset': '50%', 'stop-color': 'var(--sk-hl)' }),
          h('stop', { 'offset': '100%', 'stop-color': 'var(--sk-bg)' }),
        ]
        if (props.mode === 'sweep') {
          stops.push(h('animateTransform', {
            attributeName: 'gradientTransform',
            type: 'translate',
            from: '-1 0',
            to: '1 0',
            dur: props.durSec,
            repeatCount: 'indefinite',
          }))
        }
        children.push(
          h('defs', [
            h('linearGradient', { id: props.gradId, x1: '0', y1: '0', x2: '1', y2: '0' }, stops),
          ]),
        )
      }

      for (const s of props.shapes) {
        if (s.type === 'circle') {
          children.push(h('circle', {
            cx: s.cx ?? '50%',
            cy: s.cy ?? '50%',
            r: s.r ?? '50%',
            fill: props.fill,
          }))
        }
        else {
          children.push(h('rect', {
            x: s.x ?? 0,
            y: s.y ?? 0,
            width: s.w ?? '100%',
            height: s.h ?? '100%',
            rx: s.rx,
            ry: s.rx,
            fill: props.fill,
          }))
        }
      }

      return h('svg', {
        'class': ['sk-svg', `sk-svg--${props.mode}`],
        'width': props.width,
        'height': props.height,
        'style': props.svgStyle,
        'role': 'img',
        'aria-label': 'Caricamento…',
        ...attrs,
      }, children)
    }
  },
})
