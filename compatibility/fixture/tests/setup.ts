import { vi } from 'vitest'

Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
  configurable: true,
  value: true,
})

Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  value: vi.fn(),
})

Object.defineProperty(HTMLElement.prototype, 'inert', {
  configurable: true,
  get() {
    return this.hasAttribute('inert')
  },
  set(value: boolean) {
    this.toggleAttribute('inert', value)
  },
})
