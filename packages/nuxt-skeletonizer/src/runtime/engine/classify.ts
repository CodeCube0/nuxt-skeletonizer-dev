import type { SkeletonBoneKind } from '../../types'
import { ATTR, CLASS } from '../constants'

/**
 * The result of inspecting a single element.
 *
 * - a `SkeletonBoneKind` → paint this element as a leaf bone, do not descend
 * - `'container'`        → leave untouched, descend into children
 * - `'skip'`             → leave untouched, do not descend (ignored subtree)
 * - `'shimmer'`          → apply shimmer overlay only, descend into children
 */
export type Classification = SkeletonBoneKind | 'container' | 'skip' | 'shimmer'

const HEADING_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6'])
const IMAGE_TAGS = new Set(['IMG', 'PICTURE', 'VIDEO', 'CANVAS'])
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'BR', 'HR', 'WBR'])

/** True when a string contains at least one non-whitespace character. */
function hasText(value: string | null): boolean {
  return !!value && value.trim().length > 0
}

/** Whether an element has any element children (vs. only text/comment nodes). */
function hasElementChildren(el: Element): boolean {
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === 1) return true
  }
  return false
}

/** Whether the element's direct text content is non-empty. */
function hasOwnText(el: Element): boolean {
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === 3 && hasText(child.textContent)) return true
  }
  return false
}

/**
 * Decide whether an element with rounded corners is an avatar (roughly square
 * and visibly circular) rather than a generic rounded image.
 */
function looksLikeAvatar(el: HTMLElement, style: CSSStyleDeclaration): boolean {
  const radius = Number.parseFloat(style.borderRadius)
  const w = el.clientWidth || Number.parseFloat(style.width) || 0
  const h = el.clientHeight || Number.parseFloat(style.height) || 0
  if (!w || !h) return false
  const square = Math.abs(w - h) / Math.max(w, h) < 0.2
  const round = style.borderRadius.includes('%')
    ? Number.parseFloat(style.borderRadius) >= 40
    : radius >= Math.min(w, h) / 2 - 1
  return square && round
}

/**
 * Detect small inline "chips" — badges and tags — by their inline display,
 * rounded background and short text.
 */
function looksLikeBadge(el: HTMLElement, style: CSSStyleDeclaration): SkeletonBoneKind | null {
  const display = style.display
  const inline = display === 'inline-block' || display === 'inline-flex' || display === 'inline'
  const rounded = Number.parseFloat(style.borderRadius) > 0 || style.borderRadius.includes('%')
  const short = (el.textContent ?? '').trim().length <= 24
  const role = el.getAttribute('role')
  if (role === 'status' || el.className.toLowerCase().includes('badge')) return 'badge'
  if (el.className.toLowerCase().includes('tag') || el.className.toLowerCase().includes('chip')) return 'tag'
  if (inline && rounded && short && hasOwnText(el)) return 'badge'
  return null
}

/**
 * Classify an element into a skeleton treatment. Directive attributes always
 * win over heuristics so authors can override the engine precisely.
 */
export function classify(el: HTMLElement, style: CSSStyleDeclaration): Classification {
  const tag = el.tagName

  // Structural tags carry no visible content worth skeletonizing.
  if (SKIP_TAGS.has(tag)) return 'skip'

  // Our own injected overlay / SVG nodes — never re-scan them.
  if (el.classList.contains(CLASS.overlay) || el.classList.contains(CLASS.svg)) {
    return 'skip'
  }

  // --- Directive overrides (highest priority) -----------------------------
  if (el.hasAttribute(ATTR.ignore) || el.hasAttribute(ATTR.keep)) return 'skip'
  if (el.hasAttribute(ATTR.shimmer)) return 'shimmer'
  if (el.hasAttribute(ATTR.union)) return 'block'
  if (el.hasAttribute(ATTR.replace)) {
    const forced = el.getAttribute(ATTR.replace)
    return (forced && forced.length > 0 ? forced : 'block') as SkeletonBoneKind
  }

  // Invisible elements are skipped (and so is their subtree).
  if (style.display === 'none' || style.visibility === 'hidden') return 'skip'

  // --- Form controls -------------------------------------------------------
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type
    if (type === 'checkbox') return 'checkbox'
    if (type === 'radio') return 'radio'
    if (type === 'hidden') return 'skip'
    return 'input'
  }
  if (tag === 'TEXTAREA') return 'textarea'
  if (tag === 'SELECT') return 'select'

  const role = el.getAttribute('role')
  if (role === 'switch') return 'switch'

  // --- Replaced / media elements ------------------------------------------
  if (IMAGE_TAGS.has(tag)) {
    return looksLikeAvatar(el, style) ? 'avatar' : 'image'
  }
  if (tag === 'SVG' || tag === 'svg') {
    // Small standalone SVGs read as icons; larger ones as images.
    const w = el.clientWidth || 0
    return w > 0 && w <= 48 ? 'icon' : 'image'
  }

  // --- Interactive ---------------------------------------------------------
  if (tag === 'BUTTON' || role === 'button') return 'button'
  if (tag === 'A' && /\bbtn\b|button/i.test(el.className)) return 'button'

  // --- Headings ------------------------------------------------------------
  if (HEADING_TAGS.has(tag)) return 'heading'

  // --- Badges / tags (before generic text) --------------------------------
  const badge = looksLikeBadge(el, style)
  if (badge) return badge

  // --- Generic content -----------------------------------------------------
  // An element with element children is a layout container: keep it, descend.
  if (hasElementChildren(el)) return 'container'

  // A leaf with its own text is a text bone.
  if (hasOwnText(el)) return 'text'

  // An empty leaf that paints something (icon font, background) is an icon;
  // a truly empty/invisible leaf is skipped.
  const bg = style.backgroundImage
  const paints
    = (!!bg && bg !== 'none')
      || Number.parseFloat(style.borderWidth) > 0
      || el.className.toLowerCase().includes('icon')
  return paints ? 'icon' : 'skip'
}
