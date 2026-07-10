import { afterEach } from 'vitest'
import { __resetAnimations } from '../src/runtime/animations'
import { setActiveStore } from '../src/runtime/state'

// Keep each test isolated: clear injected animations, reset the active store,
// and wipe any DOM the previous test mounted.
afterEach(() => {
  __resetAnimations()
  setActiveStore(null)
  if (typeof document !== 'undefined') {
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('style')
  }
})
