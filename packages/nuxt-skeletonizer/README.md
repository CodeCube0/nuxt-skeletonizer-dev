# Nuxt Skeletonizer

> Automatic skeleton UI for Nuxt 4 — turn any component into a layout-preserving **SVG** skeleton.
> The Vue/Nuxt equivalent of Flutter's [Skeletonizer](https://pub.dev/packages/skeletonizer).

[![npm version](https://img.shields.io/npm/v/nuxt-skeletonizer.svg)](https://www.npmjs.com/package/nuxt-skeletonizer)
[![npm downloads](https://img.shields.io/npm/dm/nuxt-skeletonizer.svg)](https://www.npmjs.com/package/nuxt-skeletonizer)
[![license](https://img.shields.io/npm/l/nuxt-skeletonizer.svg)](./LICENSE)

---

## Table of contents

- [Introduction](#introduction)
- [Philosophy](#philosophy)
- [Why SVG?](#why-svg)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [API](#api)
- [Components](#components)
- [Directives](#directives)
- [Composable](#composable)
- [Adaptive engine](#adaptive-engine)
- [Nuxt integration](#nuxt-integration)
- [Theming](#theming)
- [Animations](#animations)
- [DevTools](#devtools)
- [Performance](#performance)
- [Accessibility & SSR](#accessibility--ssr)
- [FAQ](#faq)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [Changelog](#changelog)

---

## Introduction

`nuxt-skeletonizer` generates skeleton loading states **automatically** from your existing
markup. Instead of hand-building a parallel "skeleton" component for every screen, you wrap the
real component once:

```vue
<Skeletonizer :enabled="pending">
  <UserProfile />
</Skeletonizer>
```

When `enabled` is `true`, the module scans the rendered subtree, classifies and measures each
element (text, heading, image, avatar, button, input, …) and draws a single **`<svg>` overlay** of
placeholder **bones** on top of the (now-hidden) real content — while keeping the **exact same
layout**, so there is no layout shift when the real content arrives. Each bone is one `<rect>`
(avatars become `<circle>`), so an entire screen becomes **one** extra DOM node instead of hundreds.

## Philosophy

- **No duplicated components.** Skeletons are derived from the real DOM, not authored by hand.
- **Zero layout shift.** The real elements are never moved, wrapped or removed — they are only
  hidden in place (kept in layout) and an SVG overlay is painted on top, so the page occupies the
  exact same space before and after loading.
- **Layout is preserved end-to-end:** `width`, `height`, `min/max` sizes, `padding`, `margin`,
  `border-radius`, `flex`, `grid`, `gap` and `aspect-ratio` all stay intact because the original
  elements remain in the tree and the overlay is measured from their real bounding boxes.
- **Minimal app code.** A single wrapper (or a global toggle) is usually all you need.

## Why SVG?

SVG is the **only** rendering backend, and it is a deliberate choice rather than a tradeoff:

- **It mirrors the scanner's model.** The scan layer produces a list of measured bounding boxes
  (`ScannedNode[]`). SVG is a bounding-box drawing surface — each node maps 1:1 to a `<rect>`
  (avatars to a `<circle>`), so there is no impedance mismatch between what we measure and what we
  draw.
- **One node instead of hundreds.** A single `<svg>` overlay replaces the per-element DOM bones a
  naïve approach would inject. A 2 000-bone screen costs **one** extra element, which keeps the DOM
  node count — and therefore style/layout cost — flat regardless of complexity.
- **Native, JS-free animation.** The shimmer is a shared `<linearGradient>` animated with
  `<animateTransform>` (sweep presets) or the shapes' opacity (`<animate>` for pulse/fade). The
  browser drives it on the compositor — no per-frame JavaScript and no CSS thrashing during render.
- **SSR-safe by construction.** The overlay serializes to plain markup on the server and **hydrates
  without mismatch** on the client, and it works correctly inside `<Teleport>`, `<Suspense>` and
  `<KeepAlive>`.
- **Resolution-independent.** `preserveAspectRatio` plus a `viewBox` locked to the host bounding box
  means the overlay scales cleanly to any viewport.
- **Accessible.** The overlay is exposed as `role="img"` with an `aria-label`, and the hidden real
  content is `aria-hidden` while loading.

**Why not Canvas?** A `<canvas>` raster is *not* serializable for SSR (so it would force a
client-only flash), it must be **imperatively redrawn on every resize/DPR change**, and it is opaque
to assistive technology. SVG gives the same single-node cost with none of those downsides.

## Installation

```bash
npm install nuxt-skeletonizer
# or: pnpm add nuxt-skeletonizer / yarn add nuxt-skeletonizer
```

Add it to your Nuxt config:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-skeletonizer'],
})
```

That's it — components, the composable and the directives are auto-imported, and the stylesheet is
injected for you.

## Quick start

```vue
<script setup lang="ts">
const { data: user, pending } = await useLazyFetch('/api/user')
</script>

<template>
  <Skeletonizer :enabled="pending">
    <article class="profile">
      <img :src="user?.avatar" width="64" height="64" class="avatar">
      <h1>{{ user?.name }}</h1>
      <p>{{ user?.bio }}</p>
      <button>Follow</button>
    </article>
  </Skeletonizer>
</template>
```

While `pending` is `true`, the avatar, heading, paragraph and button render as animated bones. When
the fetch resolves, the originals are restored instantly.

You can also drive it globally from anywhere:

```ts
const skeletonizer = useSkeletonizer()
skeletonizer.enable()   // every <Skeletonizer> with no explicit `enabled` turns on
skeletonizer.disable()
skeletonizer.toggle()
```

## Configuration

All options are set under the `skeletonizer` key and have sensible defaults:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-skeletonizer'],
  skeletonizer: {
    enabled: true,              // master switch / initial global state
    autoScan: true,             // run the automatic DOM-scan engine
    shimmer: true,              // enable the highlight animation
    shimmerDuration: 1200,      // animation cycle in ms
    animation: 'wave',          // wave | pulse | fade | gradient | shine | none
    baseColor: '#e5e7eb',       // light-theme bone color
    highlightColor: '#f8fafc',  // light-theme highlight color
    darkBaseColor: '#2a2a2a',   // dark-theme bone color
    darkHighlightColor: '#3a3a3a', // dark-theme highlight color
    borderRadius: '0.375rem',   // default bone radius
    opacity: 1,                 // resting bone opacity
    respectBorderRadius: true,  // keep each element's own radius
    debug: false,               // verbose engine logging
    darkModeSelector: '.dark',  // selector that activates dark colors
    scanDebounce: 50,           // MutationObserver debounce (ms)
    maxScanDepth: 64,           // safety cap for deep trees

    // SVG renderer
    renderMode: 'svg',          // read-only — SVG is the only backend
    svgPrecision: 1,            // decimal places when rounding SVG coordinates
    svgSharedGradient: true,    // one shared <linearGradient> in <defs> vs one per shape

    // Adaptive engine — all opt-in, default off
    adaptive: false,            // FPS/CPU-driven animation-tier degradation
    minFps: 45,                 // FPS floor; sustained drops degrade the animation tier
    layoutCache: false,         // false | 'memory' | 'session'
    telemetry: false,           // collect per-stage timings, FPS, memory, cache ratio
    offThread: false,           // offload heavy compute to a Web Worker / idle
    explain: false,             // natural-language explanations of engine decisions
  },
})
```

Every value is exposed on `runtimeConfig.public.skeletonizer`, so you can override it per
environment without rebuilding. `renderMode` is read-only (`'svg'`) — it exists so callers can
assert against it; setting it to anything else is a type error. The adaptive options power the
[adaptive engine](#adaptive-engine) and all default to off, so the module behaves exactly as a pure
SVG painter unless you opt in.

## API

The module ships three kinds of public surface:

| Surface | What it is |
| --- | --- |
| `<Skeletonizer>` + `Skeleton*` components | Auto-imported Vue components |
| `v-skeleton-*` directives | Fine-grained control over the engine |
| `useSkeletonizer()` | Reactive composable for global/scoped control |

## Components

All components are auto-imported (no manual import needed).

### `<Skeletonizer>`

The engine host. Wrap any subtree; everything inside is skeletonized automatically when active.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | _(global)_ | Scope override for the global enabled flag. |
| `animation` | `string` | _(global)_ | Animation preset for this scope. |
| `shimmer` | `boolean` | _(global)_ | Whether the animation runs. |
| `autoScan` | `boolean` | _(global)_ | Run the DOM-scan engine. |
| `theme` | `object` | – | Scoped theme token overrides (see [Theming](#theming)). |
| `tag` | `string` | `'div'` | Wrapper tag. It hosts the absolutely-positioned SVG overlay. |

Exposes `scan()` and `restore()` via template ref.

### Manual primitives

When you'd rather author a skeleton explicitly (or for parts of the UI that aren't rendered yet),
use the building blocks. They animate on their own and pick up the global theme.

| Component | Key props |
| --- | --- |
| `<SkeletonBlock>` | `width`, `height`, `radius`, `circle` |
| `<SkeletonText>` | `lines`, `lineHeight`, `gap`, `lastLineWidth` |
| `<SkeletonAvatar>` | `size`, `shape` (`circle`/`square`), `radius` |
| `<SkeletonImage>` | `width`, `height`, `aspectRatio`, `radius` |
| `<SkeletonButton>` | `width`, `height`, `radius`, `block` |
| `<SkeletonCard>` | `media`, `avatar`, `footer`, `lines` |
| `<SkeletonContainer>` | `layout` (`flex`/`grid`), `direction`, `columns`, `gap` |
| `<SkeletonList>` | `items`, `avatar`, `lines`, `gap` |
| `<SkeletonTable>` | `rows`, `columns`, `header`, `gap` |

Every primitive also accepts `animation` and `shimmer` overrides.

```vue
<template>
  <SkeletonList :items="6" :lines="2" />
  <SkeletonTable :rows="10" :columns="5" />
  <SkeletonCard media avatar :lines="3" />
</template>
```

## Directives

Use directives inside a `<Skeletonizer>` to steer the automatic engine:

| Directive | Effect |
| --- | --- |
| `v-skeleton-ignore` | Exclude the element **and its subtree** from skeletonization. |
| `v-skeleton-keep` | Keep the original content visible inside an otherwise-skeletonized tree. |
| `v-skeleton-replace="'avatar'"` | Force a specific bone kind on the element (skips its subtree). |
| `v-skeleton-union` | Collapse the element and its subtree into a **single** bone. |
| `v-skeleton-shimmer` | Apply only the shimmer overlay, keeping the content visible. |

```vue
<Skeletonizer :enabled="pending">
  <header v-skeleton-keep>
    <Logo /> <!-- always shown, never skeletonized -->
  </header>

  <ul>
    <li v-for="item in items" :key="item.id" v-skeleton-union>
      {{ item.label }}
    </li>
  </ul>

  <span v-skeleton-replace="'badge'">{{ status }}</span>
</Skeletonizer>
```

## Composable

```ts
const skeletonizer = useSkeletonizer()

skeletonizer.enable()          // turn skeleton mode on globally
skeletonizer.disable()         // turn it off
skeletonizer.toggle()          // flip it; returns the new boolean
skeletonizer.isEnabled         // ComputedRef<boolean>
skeletonizer.config            // reactive resolved config (incl. read-only renderMode: 'svg')
skeletonizer.stats             // reactive runtime statistics
skeletonizer.refresh()         // re-scan all mounted hosts (rebuild the SVG overlays)
skeletonizer.scan()            // re-scan; returns { nodes, svg, cacheHit } for the latest host

skeletonizer.setTheme({ baseColor: '#ddd', highlightColor: '#fff' })
skeletonizer.setAnimation('pulse')
skeletonizer.registerAnimation({ name: 'blink', css: '…' })

skeletonizer.engine            // the per-app SkeletonEngine (advanced / DevTools access)
```

`scan()` returns the latest host's `{ nodes, svg, cacheHit }` — the measured `ScannedNode[]`, the
generated `<svg>` overlay markup, and whether the blueprint was served from the layout cache.

It works at any scope — **globally**, **per page**, **per component** or **per container** — because
control is centralised in a single reactive store that every `<Skeletonizer>` host subscribes to.

## Adaptive engine

The SVG renderer is the same in every configuration; on top of it an **opt-in adaptive engine** adds
FPS-aware animation, a layout cache, telemetry and Explain Mode for huge, dynamic pages. Enable any
of the [adaptive options](#configuration) and the host routes through the layered `SkeletonEngine`
(Scan/Classify/Measure → Optimize → Render → Telemetry/Policy) that adapts to the live device load.
It is **fully additive** — with the default config the engine is a pure SVG painter with zero extra
overhead.

### The rendering pipeline

There is a single, fixed backend. The flow is always:

1. **Scan layer** — walks the host subtree (iterative DFS, leaf-stop), classifies and measures each
   element into a `ScannedNode[]` of bounding boxes. The real elements are never mutated.
2. **SVG renderer** — emits one `<svg>` overlay: every node becomes a `<rect>` (avatars a
   `<circle>`), all sharing a single namespaced gradient (`sk-shimmer-{uid}`) animated with
   `<animateTransform>`/`<animate>`.
3. **CLS guard** — locks the overlay `viewBox` to the host's bounding box, so the skeleton box is
   pixel-stable and never shifts the page.
4. **Overlay** — the `<svg>` is positioned absolutely over the (hidden but still laid-out) real
   content.

### What the adaptive engine does

- **Adaptive animation** — a composite score from real FPS/CPU drives an animation-tier ladder
  (`full → reduced → static`, i.e. wave/gradient/shine → pulse → none) with hysteresis, plus
  **shimmer auto-disable** under hardware stress. FPS is sampled (via `requestAnimationFrame`)
  **only while loading** and stops the instant content hydrates — zero steady-state overhead.
- **Layout cache** — a layout **fingerprint + blueprint cache** (`memory`/`session`) that replays a
  known route/viewport's SVG instantly (a *cache hit* skips the scan+render entirely).
- **CLS guard** — keeps the skeleton box pixel-stable so the overlay never shifts the page.
- **Telemetry & off-threading** — per-stage timings, FPS, memory and cache ratio, with heavy compute
  (fingerprints, analysis) offloaded to a **Web Worker** / `requestIdleCallback`.
- **Explain Mode** — natural-language explanations of every decision (e.g. *“Degraded to pulse:
  41 FPS under the 45 floor”*), surfaced for DevTools.

### `useSkeletonPerformance()`

The advanced performance / DevTools surface — telemetry, Explain Mode, a bottleneck ranking and a
**Blueprint Inspector** that returns the most recently generated SVG:

```ts
const perf = useSkeletonPerformance()

perf.stats              // reactive: renderMode, score, fps, animationTier, cache, timings…
perf.telemetry()        // { avgTotalMs, avgScanMs, cacheHitRatio, … }
perf.series('fps')      // number[] for a sparkline
perf.explanations()     // natural-language engine decisions (Explain Mode)
perf.bottlenecks()      // hosts ranked by skeletonization cost
perf.cacheHitRatio      // ComputedRef<number> — blueprint cache hit ratio
perf.blueprint()        // SvgBlueprint | null — the latest generated <svg> + metadata
```

`blueprint()` returns the `SvgBlueprint` (`{ svg, nodeCount, width, height, gradientId, tier }`) for
the most recent render, or `null` before the first scan.

## Nuxt integration

`nuxt-skeletonizer` is built for Nuxt's data-fetching flow. The idiomatic pattern is to bind
`:enabled` to the `pending`/`status` of any data composable:

```vue
<script setup lang="ts">
const { data, pending } = await useLazyAsyncData('users', () => $fetch('/api/users'))
</script>

<template>
  <Skeletonizer :enabled="pending">
    <UserTable :rows="data" />
  </Skeletonizer>
</template>
```

This works with `useFetch`, `useLazyFetch`, `useAsyncData`, `useLazyAsyncData`, `useState`,
`callOnce`, `useRoute` and any other source of a reactive boolean. SSR, hydration, layouts and Nuxt
Layers are all supported out of the box.

### `skeleton: true` data composables

For the most concise integration, use the auto-imported skeleton-aware wrappers. They mirror Nuxt's
data composables and, when `skeleton: true` (the default), turn the global skeleton on while the
request is pending and off when it settles — **ref-counted**, so concurrent requests compose
correctly:

```ts
// Skeleton turns on automatically while this request is in flight.
const { data } = await useSkeletonFetch('/api/users', { skeleton: true })
```

Available wrappers: `useSkeletonFetch`, `useSkeletonLazyFetch`, `useSkeletonAsyncData`,
`useSkeletonLazyAsyncData`. Pass `{ skeleton: false }` to opt a single call out. Any
`<Skeletonizer>` without an explicit `:enabled` follows this global state.

## Theming

Everything is driven by CSS custom properties, so themes can be changed at runtime with no
re-render:

| Variable | Purpose |
| --- | --- |
| `--sk-base-color` | Bone base color |
| `--sk-highlight-color` | Highlight/sweep color |
| `--sk-dark-base-color` / `--sk-dark-highlight-color` | Dark-mode equivalents |
| `--sk-radius` | Default bone radius |
| `--sk-opacity` | Resting opacity |
| `--sk-duration` | Animation cycle length |

**Light/Dark:** dark colors activate automatically under the `.dark` selector (configurable) or
`[data-theme="dark"]`.

**Runtime switching:**

```ts
const { setTheme } = useSkeletonizer()
setTheme({ baseColor: '#1f2937', highlightColor: '#374151' })
```

**Scoped theme** (one subtree only):

```vue
<Skeletonizer :enabled="pending" :theme="{ baseColor: '#fde68a' }">
  <PromoBanner />
</Skeletonizer>
```

## Animations

Built-in presets: **`wave`**, **`pulse`**, **`fade`**, **`gradient`**, **`shine`**, and `none`.

Register your own at runtime — the API is fully extensible:

```ts
useSkeletonizer().registerAnimation({
  name: 'blink',
  css: `
    @keyframes sk-blink { 0%,100% { opacity: 1 } 50% { opacity: .3 } }
    .sk-anim-blink .sk-bone { animation: sk-blink var(--sk-duration) infinite }
  `,
})
useSkeletonizer().setAnimation('blink')
```

Animations honour `prefers-reduced-motion: reduce` automatically.

## DevTools

When [Nuxt DevTools](https://devtools.nuxt.com) is enabled, a **Skeletonizer** tab is added showing
the live runtime state and statistics (active hosts, painted bones, ignored elements, scan count and
last scan duration), exposed reactively via `useSkeletonizer().stats`.

With the [adaptive engine](#adaptive-engine) active, the runtime intelligence — **pipeline
timings**, the **Blueprint Inspector** (the raw generated `<svg>`), **Explain Mode**
(natural-language decisions) and a **bottleneck ranking** of the slowest hosts — is available
through `useSkeletonPerformance()`, ready to back a DevTools panel.

## Performance

The engine is designed for enterprise dashboards, tables with thousands of rows and deep component
trees:

- **One overlay node** — an entire screen of bones is a single `<svg>`, so the DOM node count and
  style/layout cost stay flat no matter how many bones are drawn.
- **Non-destructive** — the real elements are only hidden in place (kept in layout), never moved or
  removed, so there is no layout-shift recomputation.
- **Leaf-stop traversal** — the scanner descends only into containers and stops at the first bone,
  pruning large subtrees.
- **Idempotent scans** — already-scanned hosts are skipped, so re-scans are cheap.
- **Debounced `MutationObserver`** — bursts of DOM changes coalesce into a single re-scan
  (`scanDebounce`, default 50 ms).
- **Depth cap** — `maxScanDepth` guards pathological trees.

For extreme pages, the opt-in [adaptive engine](#adaptive-engine) goes further — an FPS-aware
animation tier, a layout-blueprint cache and off-thread compute.

Want to see it rather than take our word for it? The documentation site (fully bilingual, EN + IT)
ships two interactive sections:

- **Engine Deep Dive** (`/engine`) — a multi-phase stepper through the real pipeline (including the
  adaptive layers), with verbatim source, DOM before/after, the generated SVG blueprint, live
  metrics and architecture/lifecycle/flow diagrams.
- **Extreme Performance Lab** (`/performance`) — runnable enterprise-scale scenarios (massive data
  grids, 1000-field forms, CRM, e-commerce, kanban, giant trees, deeply nested layouts) with
  genuinely measured telemetry (scan time, DOM nodes, bones, FPS, JS heap), adaptive controls and
  Explain Mode.

## Accessibility & SSR

- The SVG overlay is exposed as `role="img"` with an `aria-label`; the hidden real content is
  `aria-hidden` and active hosts get `aria-busy`.
- The overlay serializes to markup on the server and **hydrates without mismatch** on the client, so
  server and client initial renders match — and it works inside `<Teleport>`/`<Suspense>`/`<KeepAlive>`.
- All animations respect `prefers-reduced-motion`.

## FAQ

**Does it work without writing skeleton components?**
Yes — that's the whole point. Wrap real markup in `<Skeletonizer>` and the engine does the rest.

**Will it cause layout shift?**
No. Elements are styled in place and never removed, so the layout is identical before/after.

**Can I mix automatic and manual skeletons?**
Yes. Manual `Skeleton*` components are recognised by the engine and left untouched.

**Does it support dark mode?**
Yes, automatically via `.dark` / `[data-theme="dark"]`, plus runtime `setTheme`.

## Troubleshooting

**An `<img>` still shows its picture.** Make sure the image is inside an active `<Skeletonizer>`.
The SVG overlay draws an opaque bone over the image while the host is hidden; `<canvas>`/`<video>`
are a known edge case — use `v-skeleton-replace="'image'"` or a `<SkeletonImage>` for those.

**My custom widget isn't skeletonized correctly.** Use `v-skeleton-replace="'<kind>'"` to force a
bone kind, or `v-skeleton-union` to collapse it into a single bone.

**The skeleton flashes on first paint.** The engine runs after hydration by design. Bind `:enabled`
to your loading state so it only activates while data is pending.

**Nothing happens.** Confirm `skeletonizer.enabled` isn't `false` globally and that the subtree is
actually inside a `<Skeletonizer>` (or that you called `useSkeletonizer().enable()`).

## Contributing

```bash
git clone https://github.com/CodeCube0/nuxt-skeletonizer
cd nuxt-skeletonizer
npm install
npm run build      # build the module
npm test           # run the unit/integration suite
npm run test:coverage
npm run typecheck
npm run lint
```

The package lives in `packages/nuxt-skeletonizer`. Tests use Vitest + Vue Test Utils with
happy-dom. Please add tests for any new behaviour and keep coverage ≥ 90%.

## Roadmap

- Per-line text bones inferred from rendered line boxes.
- Optional overlay handling for `<canvas>`/`<video>` rasters.
- Server Components support as the Nuxt API stabilises.

## Changelog

### 0.2.0 — SVG-only renderer

- **Single SVG backend.** The multi-backend renderer (DOM / Virtual / Canvas) and all runtime
  strategy switching were removed. Every host now draws one `<svg>` overlay — bones as `<rect>`,
  avatars as `<circle>`, with a shared namespaced gradient animated via `<animateTransform>`.
- **New options:** `renderMode: 'svg'` (read-only), `svgPrecision` (default `1`), `svgSharedGradient`
  (default `true`).
- **Removed options:** `renderStrategy`, `autoSwitch`, `fastPathThreshold`, `domBudget`,
  `viewportOnly`, `viewportLookahead`, `clustering`, `policies`. Removed the `strategy` prop on
  `<Skeletonizer>`, the `setRenderStrategy`/`addPolicy`/`removePolicy` controls, and the
  `useVirtualSkeleton` composable (with its `agGridRange`/`tanstackRange`/`primeVueRange` adapters).
- **API:** `useSkeletonizer().scan()` now returns `{ nodes, svg, cacheHit }`;
  `useSkeletonPerformance()` gains `blueprint()` (the latest `SvgBlueprint`).
- `layoutCache` is now `false | 'memory' | 'session'`.

### 0.1.1 — Adaptive engine

- **Adaptive engine (opt-in):** a layered `SkeletonEngine` with an FPS/CPU performance score,
  animation-tier auto-degradation (`full → reduced → static`) with hysteresis and shimmer
  auto-disable, plus a CLS guard.
- **Layout cache:** layout fingerprint + blueprint cache (`memory`/`session`).
- **Telemetry & off-threading:** per-stage timings, FPS, memory and cache ratio, with heavy compute
  offloaded to a Web Worker / `requestIdleCallback`; plus **Explain Mode** and a bottleneck ranking
  via `useSkeletonPerformance`.
- All additive — the default config is unchanged.

### 0.1.0

- Initial release: Nuxt 4 module, automatic DOM-scan engine, 10 components, 5 directives,
  `useSkeletonizer` composable, CSS-variable theming (light/dark/custom/runtime), 5 animations +
  extensible API, DevTools tab, SSR/hydration safety, and a unit/integration test suite at
  ≥ 90% coverage.

---

Licensed under the [MIT License](./LICENSE).
