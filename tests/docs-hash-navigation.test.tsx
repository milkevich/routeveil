import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { DocsPage } from '../src/app/pages/docs/DocsPage'
import { RouteveilProvider } from '../src/react-router'
import { installBrowserMocks } from './browser-mocks'

vi.mock('../src/app/shared/lib/highlightCode', () => ({
  highlightCode: async () => '<pre></pre>',
}))

describe('documentation hash navigation', () => {
  let browserMocks: ReturnType<typeof installBrowserMocks>
  let scrollIntoViewDescriptor: PropertyDescriptor | undefined
  const scrollIntoView = vi.fn()

  beforeEach(() => {
    browserMocks = installBrowserMocks()
    scrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'scrollIntoView',
    )
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
      writable: true,
    })
  })

  afterEach(() => {
    browserMocks.restore()
    scrollIntoView.mockReset()

    if (scrollIntoViewDescriptor) {
      Object.defineProperty(
        Element.prototype,
        'scrollIntoView',
        scrollIntoViewDescriptor,
      )
    } else {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
    }
  })

  it('positions the requested section during layout without deferred frames', () => {
    render(
      <MemoryRouter initialEntries={['/docs#installation']}>
        <RouteveilProvider>
          <DocsPage />
        </RouteveilProvider>
      </MemoryRouter>,
    )

    expect(scrollIntoView).toHaveBeenCalledOnce()
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'instant' })
    expect(scrollIntoView.mock.instances[0]).toHaveAttribute(
      'id',
      'installation',
    )
    expect(browserMocks.pendingFrames).toBe(1)
  })
})
