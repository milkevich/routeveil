import { StrictMode } from 'react'
import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import {
  createMemoryRouter,
  RouterProvider,
} from 'react-router-dom'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  RouteveilProvider,
  RouteveilView,
} from '../src/react-router'
import { installBrowserMocks } from './browser-mocks'

function rect(
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    toJSON: () => ({}),
    top,
    width,
    x: left,
    y: top,
  } as DOMRect
}

function LabApp() {
  return (
    <RouteveilProvider>
      <RouteveilView />
    </RouteveilProvider>
  )
}

function createLabRouter(initialEntry = '/lab/shared-elements') {
  return createMemoryRouter([
    {
      path: '/',
      element: <LabApp />,
      children: [
        {
          path: 'lab/shared-elements',
          lazy: async () => ({
            Component: (
              await import(
                '../src/app/pages/lab/shared-elements/SharedElementsDemoPage'
              )
            ).SharedElementsDemoPage,
          }),
        },
        {
          path: 'lab/shared-elements/detail',
          lazy: async () => ({
            Component: (
              await import(
                '../src/app/pages/lab/shared-elements/SharedElementsDemoPage'
              )
            ).SharedElementsDetailPage,
          }),
        },
      ],
    },
  ], { initialEntries: [initialEntry] })
}

function portalWrapper(name: string): HTMLElement {
  const wrapper = document.querySelector<HTMLElement>(
    `[data-routeveil-shared-element="${name}"]`,
  )

  if (!wrapper) {
    throw new Error(`Missing shared wrapper ${name}`)
  }

  return wrapper
}

function portalElementNames(): string[] {
  return [...document.querySelectorAll(
    '[data-routeveil-shared-portal] [data-routeveil-shared-element]',
  )]
    .map((element) => element.getAttribute('data-routeveil-shared-element'))
    .filter((name): name is string => name !== null)
    .sort()
}

function requireElement<T extends Element>(
  parent: ParentNode,
  selector: string,
): T {
  const element = parent.querySelector<T>(selector)

  if (!element) {
    throw new Error(`Missing ${selector}`)
  }

  return element
}

function animationFrames(
  keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
): Array<Record<string, unknown>> {
  if (!Array.isArray(keyframes)) {
    throw new Error('Expected keyframe array')
  }

  return keyframes as Array<Record<string, unknown>>
}

function frameValue(
  frame: Record<string, unknown>,
  property: string,
): unknown {
  const kebabProperty = property.replace(
    /[A-Z]/g,
    (letter) => `-${letter.toLowerCase()}`,
  )

  return frame[property] ?? frame[kebabProperty]
}

function expectNoOpacityCrossfade(
  animations: ReturnType<typeof installBrowserMocks>['animations'],
): void {
  for (const animation of animations) {
    const opacityValues = animationFrames(animation.keyframes)
      .map((frame) => frameValue(frame, 'opacity'))
      .filter((value) => value !== undefined)
      .map(String)

    expect(new Set(opacityValues).size).toBeLessThanOrEqual(1)
  }
}

let browser: ReturnType<typeof installBrowserMocks>
let rendered: RenderResult | null = null

async function flushTransitionFrames(count: number): Promise<void> {
  const handoffAnimations = browser.animations.filter((animation) => (
    animation.status === 'running'
    && animation.element.closest('[data-routeveil-shared-portal]') !== null
    && typeof animation.options === 'object'
    && animation.options.duration === 64
  ))

  if (handoffAnimations.length > 0) {
    await act(async () => {
      for (const animation of handoffAnimations) {
        animation.finish()
      }

      await Promise.all(handoffAnimations.map((animation) => (
        animation.animation.finished
      )))
    })
  }

  for (let index = 0; index < count; index += 1) {
    await act(async () => {
      browser.flushFrame()
      await Promise.resolve()
      await Promise.resolve()
    })
  }
}

beforeEach(() => {
  browser = installBrowserMocks({ settleAnimationOnCancel: true })
})

afterEach(() => {
  rendered?.unmount()
  rendered = null
  browser.restore()
  vi.restoreAllMocks()
})

describe('shared elements Lab', () => {
  it('renders forty accessible masonry posts with image-only sharing', async () => {
    const router = createLabRouter()

    rendered = render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    )

    const routeHeading = await screen.findByRole('heading', {
      level: 2,
      name: 'Route A',
    })
    const gallery = requireElement<HTMLElement>(document, '.shared-gallery')
    const links = [...gallery.querySelectorAll<HTMLAnchorElement>(
      ':scope > a.shared-gallery__post',
    )]
    const renderedTitles: string[] = []
    const renderedIds: string[] = []
    const renderedSources: string[] = []

    expect(routeHeading.closest('.lab-group__title')).toHaveTextContent('01')
    expect(links).toHaveLength(40)
    expect(gallery.querySelector('[class*="description"]')).toBeNull()

    for (const link of links) {
      const id = new URL(link.href).searchParams.get('post')
      const image = requireElement<HTMLImageElement>(
        link,
        ':scope > img.shared-gallery__image',
      )
      const heading = link.querySelector('.shared-gallery__title')
      const arrow = link.querySelector('.shared-gallery__arrow')

      expect(id).not.toBeNull()
      expect(link).toHaveAttribute('href', `/lab/shared-elements/detail?post=${id}`)
      expect(link.querySelector(
        'a, button, input, select, textarea',
      )).toBeNull()
      expect(image.src).toMatch(/\/shared-elements-pinterest-mock\/\d+\.(?:gif|jpg)$/u)
      expect(arrow).toHaveAttribute('aria-hidden', 'true')
      renderedIds.push(id!)
      renderedSources.push(image.src)

      if (heading) {
        const title = heading.textContent?.trim() ?? ''

        expect(heading.tagName).toBe('H3')
        expect(title).not.toBe('')
        expect(heading).toHaveTextContent(title)
        expect(link).toHaveAccessibleName(`View ${title}`)
        renderedTitles.push(title)
      } else {
        expect(link).toHaveAccessibleName(`View untitled post ${id}`)
      }
    }

    expect(new Set(renderedIds)).toEqual(new Set(
      Array.from({ length: 40 }, (_, index) => String(index + 1)),
    ))
    expect(new Set(renderedSources).size).toBe(40)
    expect(renderedTitles).toHaveLength(24)
    expect(new Set(renderedTitles).size).toBe(renderedTitles.length)
  })

  it('keeps authors, usernames, and available avatars unique', async () => {
    const router = createLabRouter('/lab/shared-elements/detail?post=1')
    const authors: string[] = []
    const usernames: string[] = []
    const avatars: string[] = []

    rendered = render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    )

    await screen.findByRole('button', { name: 'Back to image gallery' })

    for (let id = 1; id <= 40; id += 1) {
      if (id > 1) {
        await act(async () => {
          await router.navigate(`/lab/shared-elements/detail?post=${id}`)
        })
      }

      authors.push(requireElement<HTMLElement>(
        document,
        '.shared-gallery-detail__author-name',
      ).textContent?.trim() ?? '')
      usernames.push(requireElement<HTMLElement>(
        document,
        '.shared-gallery-detail__username',
      ).textContent?.trim() ?? '')
      avatars.push(requireElement<HTMLImageElement>(
        document,
        '.shared-gallery-detail__avatar',
      ).src)
    }

    const fallbackAvatars = avatars.filter((avatar) => (
      /\/avatars\/34\.webp$/u.test(avatar)
    ))
    const availableAvatars = avatars.filter((avatar) => (
      !/\/avatars\/34\.webp$/u.test(avatar)
    ))

    expect(new Set(authors).size).toBe(40)
    expect(new Set(usernames).size).toBe(40)
    expect(new Set(availableAvatars).size).toBe(32)
    expect(fallbackAvatars).toHaveLength(8)
  })

  it.each([
    {
      author: 'Mina Kaye',
      entry: '/lab/shared-elements/detail?post=2',
      src: '/shared-elements-pinterest-mock/2.jpg',
      title: 'Leopard Repetition',
      username: '@minakaye',
    },
    {
      author: 'Nora Bloom',
      entry: '/lab/shared-elements/detail',
      src: '/shared-elements-pinterest-mock/1.jpg',
      title: 'Everyone Is Dead in Neon',
      username: '@norabloom',
    },
    {
      author: 'Nora Bloom',
      entry: '/lab/shared-elements/detail?post=unknown',
      src: '/shared-elements-pinterest-mock/1.jpg',
      title: 'Everyone Is Dead in Neon',
      username: '@norabloom',
    },
    {
      author: 'Theo Marsh',
      entry: '/lab/shared-elements/detail?post=3',
      src: '/shared-elements-pinterest-mock/3.jpg',
      title: null,
      username: '@theomarsh',
    },
  ])('resolves the gallery detail for $entry', async ({
    author,
    entry,
    src,
    title,
    username,
  }) => {
    const router = createLabRouter(entry)

    rendered = render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    )

    const routeHeading = await screen.findByRole('heading', {
      level: 2,
      name: 'Route B',
    })
    const back = screen.getByRole('button', {
      name: 'Back to image gallery',
    })
    const image = requireElement<HTMLImageElement>(
      document,
      '.shared-gallery-detail__image',
    )
    const avatar = requireElement<HTMLImageElement>(
      document,
      '.shared-gallery-detail__avatar',
    )
    const detailTitle = document.querySelector(
      '.shared-gallery-detail__title',
    )

    expect(routeHeading.closest('.lab-group__title')).toHaveTextContent('02')
    expect(back.tagName).toBe('BUTTON')
    expect(image).toHaveAttribute('src', src)
    expect(image.closest('a, button')).toBeNull()
    expect(avatar).toHaveAttribute('alt', '')
    expect(document.querySelector('.shared-gallery-detail__author-name'))
      .toHaveTextContent(author)
    expect(document.querySelector('.shared-gallery-detail__username'))
      .toHaveTextContent(username)

    if (title) {
      expect(detailTitle?.tagName).toBe('H2')
      expect(detailTitle).toHaveTextContent(title)
    } else {
      expect(detailTitle).toBeNull()
    }

    expect(router.state.location.pathname + router.state.location.search)
      .toBe(entry)
  })

  it('does not navigate when the detail image is clicked', async () => {
    const entry = '/lab/shared-elements/detail?post=2'
    const router = createLabRouter(entry)

    rendered = render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    )

    const image = await screen.findByRole('img', {
      name: 'Leopard Repetition by Mina Kaye',
    })
    fireEvent.click(image)

    expect(router.state.location.pathname + router.state.location.search)
      .toBe(entry)
    expect(browser.animations.filter((animation) => (
      animation.status === 'running'
      && animation.element.hasAttribute('data-routeveil-view')
    ))).toHaveLength(0)
  })

  it('moves only the selected image through actual lazy routes both ways', async () => {
    const router = createLabRouter()
    const originalRect = HTMLElement.prototype.getBoundingClientRect
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function getBoundingClientRect() {
        if (this.classList.contains('shared-gallery__image')) {
          return rect(40, 310, 350, 219)
        }

        if (this.classList.contains('shared-gallery-detail__image')) {
          return rect(140, 110, 700, 394)
        }

        return originalRect.call(this)
      })

    const finishExit = async () => {
      const exit = browser.animations.find((animation) => (
        animation.status === 'running'
        && animation.element.hasAttribute('data-routeveil-view')
      ))

      expect(exit).toBeDefined()

      await act(async () => {
        exit!.finish()
        await exit!.animation.finished
      })
      await flushTransitionFrames(6)
    }
    const finishSharedAndEnter = async () => {
      const sharedAnimations = browser.animations.filter((animation) => (
        animation.status === 'running'
        && animation.element.closest('[data-routeveil-shared-portal]') !== null
      ))
      const wrapper = portalWrapper('2-image')

      expect(sharedAnimations.some((animation) => (
        animation.element === wrapper
      ))).toBe(true)
      expectNoOpacityCrossfade(sharedAnimations)

      await act(async () => {
        for (const animation of sharedAnimations) {
          animation.finish()
        }

        await Promise.all(sharedAnimations.map((animation) => (
          animation.animation.finished
        )))
      })

      const enter = browser.animations.find((animation) => (
        animation.status === 'running'
        && animation.element.hasAttribute('data-routeveil-view')
      ))

      expect(enter).toBeDefined()

      await act(async () => {
        enter!.finish()
        await enter!.animation.finished
      })
      await flushTransitionFrames(2)
    }

    rendered = render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    )

    const forwardLink = await screen.findByRole('link', {
      name: 'View Leopard Repetition',
    })
    browser.scrollTo.mockClear()
    fireEvent.click(forwardLink)
    await finishExit()

    expect(browser.scrollTo).not.toHaveBeenCalled()
    expect(portalElementNames()).toEqual(['2-image'])
    await finishSharedAndEnter()

    expect(router.state.location.pathname).toBe('/lab/shared-elements/detail')
    expect(router.state.location.search).toBe('?post=2')
    expect(document.querySelector('.shared-gallery-detail__author-name'))
      .toHaveTextContent('Mina Kaye')
    expect(document.querySelector('.shared-gallery-detail__title'))
      .toHaveTextContent('Leopard Repetition')

    const back = await screen.findByRole('button', {
      name: 'Back to image gallery',
    })
    back.focus()
    fireEvent.click(back)

    expect(portalElementNames()).toEqual(['2-image'])
    await finishExit()
    expect(portalElementNames()).toEqual(['2-image'])
    await finishSharedAndEnter()

    expect(router.state.location.pathname).toBe('/lab/shared-elements')
    expect(router.state.location.search).toBe('')
    expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
  })

  it('centers the selected image during programmatic back navigation', async () => {
    const router = createLabRouter('/lab/shared-elements/detail?post=2')
    const originalRect = HTMLElement.prototype.getBoundingClientRect
    let scrollX = 27
    let scrollY = 1000

    vi.spyOn(window, 'scrollX', 'get').mockImplementation(() => scrollX)
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800)
    vi.spyOn(document.documentElement, 'scrollHeight', 'get')
      .mockReturnValue(4000)
    browser.scrollTo.mockImplementation((options: ScrollToOptions) => {
      scrollX = options.left ?? scrollX
      scrollY = options.top ?? scrollY
      window.dispatchEvent(new Event('scroll'))
    })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function getBoundingClientRect() {
        if (this.classList.contains('shared-gallery__image')) {
          return rect(40, 1600 - scrollY, 350, 219)
        }

        if (this.classList.contains('shared-gallery-detail__image')) {
          return rect(140, 1100 - scrollY, 700, 394)
        }

        return originalRect.call(this)
      })

    rendered = render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    )

    const back = await screen.findByRole('button', {
      name: 'Back to image gallery',
    })
    back.focus()
    fireEvent.click(back)

    expect(portalElementNames()).toEqual(['2-image'])

    const exit = browser.animations.find((animation) => (
      animation.status === 'running'
      && animation.element.hasAttribute('data-routeveil-view')
    ))
    expect(exit).toBeDefined()

    await act(async () => {
      exit!.finish()
      await exit!.animation.finished
    })
    await flushTransitionFrames(6)

    expect(browser.scrollTo).toHaveBeenCalledWith({
      behavior: 'instant',
      left: 27,
      top: 1309.5,
    })
    expect(scrollX).toBe(27)
    expect(scrollY).toBe(1309.5)
    expect(portalElementNames()).toEqual(['2-image'])
    expect(browser.animations.some((animation) => (
      animation.status === 'running'
      && animation.element === portalWrapper('2-image')
    ))).toBe(true)
    expect(screen.getByRole('link', {
      name: 'View Leopard Repetition',
    }).querySelector('.shared-gallery__image')?.getBoundingClientRect().top)
      .toBe(290.5)
  })
})
