import type { LayoutFingerprint, SkeletonCacheMode, SvgBlueprint } from '../../../types'

/**
 * Layout Fingerprinting & Blueprint Cache.
 *
 * A layout fingerprint is a cheap, dependency-free hash of a host's identity:
 * `routePath + viewport(bucketed) + componentUID`. Two renders of the same
 * component at the same route and viewport produce the same fingerprint,
 * letting the engine skip the scan/measure/render pipeline entirely and replay
 * a cached {@link SvgBlueprint}.
 *
 * Storage is in-memory (always) with an optional `sessionStorage` mirror so a
 * blueprint survives a soft navigation. The hash uses FNV-1a — tiny, fast, and
 * good enough for cache keys; it is shared with the off-thread worker.
 */

/** FNV-1a 32-bit hash — tiny, dependency-free, good enough for cache keys. */
export function fnv1a(input: string): string {
  let h = 0x811C9DC5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/** Bucket a viewport dimension so near-identical sizes share a fingerprint. */
export function bucket(value: number, step = 80): number {
  return Math.round(value / step) * step
}

/** Compute the layout fingerprint for a host. */
export function layoutFingerprint(
  route: string,
  viewport: { width: number, height: number },
  uid: string,
): LayoutFingerprint {
  const key = fnv1a(`${route}|${bucket(viewport.width)}x${bucket(viewport.height)}|${uid}`)
  return { route, viewport, uid, key }
}

interface CacheEntry {
  blueprint: SvgBlueprint
  route: string
  storedAt: number
}

const SS_PREFIX = 'sk:bp:'

export class LayoutFingerprintCache {
  private mem = new Map<string, CacheEntry>()
  private hits = 0
  private misses = 0

  constructor(private mode: SkeletonCacheMode = 'memory', private maxEntries = 64) {}

  get enabled(): boolean {
    return this.mode !== false
  }

  get stats(): { hits: number, misses: number } {
    return { hits: this.hits, misses: this.misses }
  }

  /** Look up a cached blueprint by key, counting hits/misses. */
  get(key: string): SvgBlueprint | null {
    if (!this.enabled) return null
    let entry = this.mem.get(key) ?? null
    if (!entry && this.mode === 'session') {
      entry = this.readSession(key)
      if (entry) this.mem.set(key, entry)
    }
    if (entry) {
      this.hits++
      return entry.blueprint
    }
    this.misses++
    return null
  }

  /** Store a blueprint, evicting the oldest entry when over capacity (LRU-ish). */
  set(fingerprint: LayoutFingerprint, blueprint: SvgBlueprint, storedAt: number): void {
    if (!this.enabled) return
    const entry: CacheEntry = { blueprint, route: fingerprint.route, storedAt }
    if (this.mem.size >= this.maxEntries && !this.mem.has(fingerprint.key)) {
      const oldest = this.mem.keys().next().value
      if (oldest !== undefined) this.mem.delete(oldest)
    }
    this.mem.set(fingerprint.key, entry)
    if (this.mode === 'session') this.writeSession(fingerprint.key, entry)
  }

  /** Drop a single entry by key (e.g. when a host's content changes). */
  invalidate(key: string): void {
    this.mem.delete(key)
    if (this.mode === 'session' && typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem(SS_PREFIX + key)
      }
      catch {
        // ignore — memory tier already updated
      }
    }
  }

  /** Drop every entry stored for a route (route-change invalidation). */
  invalidateRoute(route: string): void {
    for (const [key, entry] of this.mem) {
      if (entry.route === route) this.invalidate(key)
    }
  }

  /** Drop everything (both tiers). */
  clear(): void {
    this.mem.clear()
    if (this.mode === 'session' && typeof sessionStorage !== 'undefined') {
      try {
        for (const key of Object.keys(sessionStorage)) {
          if (key.startsWith(SS_PREFIX)) sessionStorage.removeItem(key)
        }
      }
      catch {
        // ignore
      }
    }
  }

  private readSession(key: string): CacheEntry | null {
    if (typeof sessionStorage === 'undefined') return null
    try {
      const raw = sessionStorage.getItem(SS_PREFIX + key)
      return raw ? (JSON.parse(raw) as CacheEntry) : null
    }
    catch {
      return null
    }
  }

  private writeSession(key: string, entry: CacheEntry): void {
    if (typeof sessionStorage === 'undefined') return
    try {
      sessionStorage.setItem(SS_PREFIX + key, JSON.stringify(entry))
    }
    catch {
      // Quota or serialization failure — memory tier still works.
    }
  }
}
