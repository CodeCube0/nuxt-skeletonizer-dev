# Changelog

All notable changes to `nuxt-skeletonizer` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2026-07-04

### Changed

- `repository`/`bugs` now point to the release repo
  (`https://github.com/CodeCube0/nuxt-skeletonizer-release`), which mirrors exactly what gets
  published, instead of the development monorepo.

## [0.1.1] - 2026-07-04

### Changed

- `homepage` now points to the published documentation site
  (`https://codecube0.github.io/nuxt-skeletonizer-docs/`) instead of the GitHub README.

## [0.1.0] - 2026-07-03

### Added

- Core engine: non-destructive DOM scanning (iterative DFS, leaf-stop), element classification and
  bone painting via class/inline-style/attribute mutation only — zero layout shift, no hydration
  mismatch (client-only, post-hydration).
- `<Skeletonizer>` component, 9 manual `Skeleton*` primitives, `useSkeletonizer()` composable,
  `useSkeletonFetch`/`useSkeletonLazyFetch`/`useSkeletonAsyncData`/`useSkeletonLazyAsyncData` data
  composables, `v-skeleton-ignore`/`keep`/`replace`/`union`/`shimmer` directives.
- Theming via CSS variables, 5 built-in shimmer/pulse animations, dark mode and
  `prefers-reduced-motion` support.
- Adaptive enterprise engine (opt-in, off by default): FPS-aware tiering, telemetry, off-thread
  fingerprint/analysis via a Blob `Worker`, layout-fingerprint cache, animation micro-controller with
  a CLS guard, and DevTools Explain Mode / bottleneck ranking (`useSkeletonPerformance()`).
- DevTools tab registration via `devtools:customTabs`.

### Changed

- **Rendering backend is SVG-only.** The engine renders a single absolutely-positioned `<svg>`
  overlay (one `<rect>`/`<circle>` per bone, one shared gradient for the shimmer sweep) instead of a
  `dom`/`virtual`/`canvas` multi-backend architecture. There is no runtime strategy switching and no
  `SkeletonPlan` abstraction — `renderMode` is a read-only `'svg'` constant kept only for API
  stability. The previously explored `DomRenderer`/`VirtualRenderer`/`CanvasRenderer`/
  `MultiBackendManager` and the `virtualization/` subsystem were removed outright, not deprecated.
- SVG skeleton fidelity hardened: wrapped text now measures real per-line geometry via
  `Range.getClientRects()` (row-merged) instead of an artificial `100%/90%/75%` width ladder; flex/
  grid container layout (`display`/`flex-direction`/`justify-content`/`align-items`/gaps) is captured
  on `ScanOutput.containers` for verification tooling.

### Notes

- No public API changed across the SVG-only migration — same component/directive names, same
  `useSkeletonizer()` surface (`scan()` now resolves to `{ nodes, svg, cacheHit }`).
- No new runtime dependencies were introduced by either change.
