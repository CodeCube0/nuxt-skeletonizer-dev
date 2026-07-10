import type { App, Directive, DirectiveBinding } from 'vue'
import { ATTR } from '../constants'

/**
 * Set or remove a data attribute based on a directive binding value.
 * `false` removes it; `true`/`undefined` set it empty; anything else stringifies.
 */
function toggleAttr(el: HTMLElement, attr: string, value: unknown): void {
  if (value === false) {
    el.removeAttribute(attr)
    return
  }
  el.setAttribute(attr, value === true || value == null ? '' : String(value))
}

function attrDirective(attr: string): Directive<HTMLElement, unknown> {
  const apply = (el: HTMLElement, binding: DirectiveBinding<unknown>): void => {
    toggleAttr(el, attr, binding.value)
  }
  return {
    // Run before children mount so the engine sees the attribute on first scan.
    created: apply,
    mounted: apply,
    updated: apply,
    unmounted(el) {
      el.removeAttribute(attr)
    },
  }
}

/** `v-skeleton-ignore` — exclude the element and its subtree from skeletonization. */
export const vSkeletonIgnore = attrDirective(ATTR.ignore)

/** `v-skeleton-keep` — keep the original content visible inside a skeleton tree. */
export const vSkeletonKeep = attrDirective(ATTR.keep)

/** `v-skeleton-replace` — force a bone of an (optional) explicit kind. */
export const vSkeletonReplace = attrDirective(ATTR.replace)

/** `v-skeleton-union` — collapse the element and its subtree into one bone. */
export const vSkeletonUnion = attrDirective(ATTR.union)

/** `v-skeleton-shimmer` — apply only the shimmer overlay, keep content. */
export const vSkeletonShimmer = attrDirective(ATTR.shimmer)

/** Map of directive name (without the `v-` prefix) → definition. */
export const directives: Record<string, Directive<HTMLElement, unknown>> = {
  'skeleton-ignore': vSkeletonIgnore,
  'skeleton-keep': vSkeletonKeep,
  'skeleton-replace': vSkeletonReplace,
  'skeleton-union': vSkeletonUnion,
  'skeleton-shimmer': vSkeletonShimmer,
}

/** Register every skeleton directive on a Vue app. */
export function registerDirectives(app: App): void {
  for (const [name, directive] of Object.entries(directives)) {
    app.directive(name, directive)
  }
}
