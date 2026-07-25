import type { ReactNode } from 'react'
import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import {
  MemoryRouter,
  useLocation,
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
  RouteveilLink,
  RouteveilProvider,
  RouteveilSharedElement,
  RouteveilView,
  type SharedElementsOption,
  useRouteveilNavigate,
} from '../src/react-router'
import { installBrowserMocks } from './browser-mocks'

let browser: ReturnType<typeof installBrowserMocks>

function rect(
  left: number,
  top: number,
  width = 140,
  height = 84,
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

function setRect(testId: string, left: number, top: number): Element {
  const element = screen.getByTestId(testId)
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect(left, top))
  return element
}

function portalNames(): string[] {
  return [...document.querySelectorAll('[data-routeveil-shared-element]')]
    .map((element) => element.getAttribute('data-routeveil-shared-element') ?? '')
}

function Shell({
  children,
  controls,
}: {
  children: ReactNode
  controls?: ReactNode
}) {
  return (
    <MemoryRouter>
      <RouteveilProvider>
        {controls}
        <RouteveilView>{children}</RouteveilView>
      </RouteveilProvider>
    </MemoryRouter>
  )
}

function ProgrammaticButton({
  label,
  scrollToSharedElement,
  sharedElements,
}: {
  label: string
  scrollToSharedElement?: string
  sharedElements?: SharedElementsOption
}) {
  const navigate = useRouteveilNavigate()

  return (
    <button
      onClick={() => {
        void navigate('/target', {
          scrollToSharedElement,
          sharedElements,
          transition: 'fade',
        })
      }}
      type="button"
    >
      {label}
    </button>
  )
}

function UnrelatedNavigationRoutes() {
  const location = useLocation()

  return (
    <RouteveilProvider>
      <RouteveilView>
        {location.pathname === '/'
          ? (
              <>
                <RouteveilSharedElement name="selection-route-image">
                  <img
                    alt="Source artwork"
                    data-testid="selection-route-image"
                    src="/artwork.png"
                  />
                </RouteveilSharedElement>
                <RouteveilLink to="/docs" transition="fade">
                  Open docs
                </RouteveilLink>
              </>
            )
          : <main>Documentation</main>}
      </RouteveilView>
    </RouteveilProvider>
  )
}

describe('shared-element source selection', () => {
  beforeEach(() => {
    browser = installBrowserMocks()
  })

  afterEach(() => {
    browser.restore()
  })

  it.each([
    'inside-trigger',
    'contains-trigger',
  ] as const)('selects an element when it is %s', (relationship) => {
    render(
      <Shell>
        {relationship === 'inside-trigger'
          ? (
              <RouteveilLink to="/target" transition="fade">
                <RouteveilSharedElement name="selection-inside-trigger">
                  <span data-testid="inside-source">Inside source</span>
                </RouteveilSharedElement>
              </RouteveilLink>
            )
          : (
              <RouteveilSharedElement name="selection-contains-trigger">
                <div data-testid="containing-source">
                  <RouteveilLink to="/target" transition="fade">
                    Contained link
                  </RouteveilLink>
                </div>
              </RouteveilSharedElement>
            )}
      </Shell>,
    )

    if (relationship === 'inside-trigger') {
      setRect('inside-source', 10, 20)
    } else {
      setRect('containing-source', 30, 40)
    }

    fireEvent.click(screen.getByRole('link'))

    expect(portalNames()).toEqual([
      relationship === 'inside-trigger'
        ? 'selection-inside-trigger'
        : 'selection-contains-trigger',
    ])
    expect(browser.animations).toHaveLength(1)
  })

  it('selects a RouteveilLink that is itself the registered element', () => {
    render(
      <Shell>
        <RouteveilSharedElement name="selection-trigger-anchor">
          <RouteveilLink
            data-testid="registered-trigger-anchor"
            to="/target"
            transition="fade"
          >
            Registered trigger
          </RouteveilLink>
        </RouteveilSharedElement>
      </Shell>,
    )

    const anchor = setRect('registered-trigger-anchor', 18, 36)
    fireEvent.click(anchor)

    expect(anchor).toHaveStyle({ visibility: 'hidden' })
    expect(portalNames()).toEqual(['selection-trigger-anchor'])
    expect(document.querySelector(
      '[data-routeveil-shared-element="selection-trigger-anchor"] a',
    )).not.toBeNull()
    expect(browser.animations).toHaveLength(1)
  })

  it('selects multiple uniquely named elements inside one clicked link', () => {
    render(
      <Shell>
        <RouteveilLink to="/target" transition="slide">
          <RouteveilSharedElement name="selection-image">
            <img alt="Project" data-testid="multi-image" src="/project.png" />
          </RouteveilSharedElement>
          <RouteveilSharedElement name="selection-title">
            <strong data-testid="multi-title">Project title</strong>
          </RouteveilSharedElement>
        </RouteveilLink>
      </Shell>,
    )

    const image = setRect('multi-image', 20, 30)
    const title = setRect('multi-title', 20, 130)
    fireEvent.click(screen.getByRole('link'))

    expect(portalNames()).toEqual(['selection-image', 'selection-title'])
    expect(image).toHaveStyle({ visibility: 'hidden' })
    expect(title).toHaveStyle({ visibility: 'hidden' })
  })

  it('scopes repeated names to the clicked link before duplicate detection', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    render(
      <Shell>
        <RouteveilLink aria-label="Open first card" to="/target" transition="fade">
          <RouteveilSharedElement name="selection-card-image">
            <img alt="First" data-testid="first-card-image" src="/first.png" />
          </RouteveilSharedElement>
          <RouteveilSharedElement name="selection-card-title">
            <strong data-testid="first-card-title">First card</strong>
          </RouteveilSharedElement>
        </RouteveilLink>
        <RouteveilLink aria-label="Open second card" to="/target" transition="fade">
          <RouteveilSharedElement name="selection-card-image">
            <img alt="Second" data-testid="second-card-image" src="/second.png" />
          </RouteveilSharedElement>
          <RouteveilSharedElement name="selection-card-title">
            <strong data-testid="second-card-title">Second card</strong>
          </RouteveilSharedElement>
        </RouteveilLink>
      </Shell>,
    )

    setRect('first-card-image', 10, 10)
    setRect('first-card-title', 10, 100)
    setRect('second-card-image', 200, 10)
    setRect('second-card-title', 200, 100)
    fireEvent.click(screen.getByRole('link', { name: 'Open first card' }))

    expect(portalNames()).toEqual([
      'selection-card-image',
      'selection-card-title',
    ])
    expect(warn).not.toHaveBeenCalled()
  })

  it('does not select a shared element for an unrelated RouteveilLink', () => {
    render(
      <Shell>
        <section>
          <RouteveilSharedElement name="selection-sibling">
            <img alt="Project" data-testid="sibling-source" src="/project.png" />
          </RouteveilSharedElement>
        </section>
        <nav>
          <RouteveilLink to="/target" transition="fade">
            Open project
          </RouteveilLink>
        </nav>
      </Shell>,
    )

    const source = setRect('sibling-source', 24, 48)
    fireEvent.click(screen.getByRole('link', { name: 'Open project' }))

    expect(portalNames()).toEqual([])
    expect(source).not.toHaveStyle({ visibility: 'hidden' })
  })

  it('enters an unrelated route without shared target discovery', async () => {
    render(
      <MemoryRouter>
        <UnrelatedNavigationRoutes />
      </MemoryRouter>,
    )

    setRect('selection-route-image', 24, 48)
    fireEvent.click(screen.getByRole('link', { name: 'Open docs' }))

    const exit = browser.animations.find((animation) => (
      animation.status === 'running'
      && animation.element.hasAttribute('data-routeveil-view')
    ))

    expect(exit).toBeDefined()
    expect(portalNames()).toEqual([])

    await act(async () => {
      exit!.finish()
      await exit!.animation.finished
    })

    for (let index = 0; index < 4; index += 1) {
      await act(async () => {
        browser.flushFrame()
        await Promise.resolve()
        await Promise.resolve()
      })
    }

    expect(screen.getByRole('main')).toHaveTextContent('Documentation')
    expect(portalNames()).toEqual([])
    expect(browser.animations.some((animation) => (
      animation.status === 'running'
      && animation.element.hasAttribute('data-routeveil-view')
    ))).toBe(true)
  })

  it('selects an explicitly named shared element outside a link', () => {
    render(
      <Shell>
        <RouteveilSharedElement name="selection-explicit-sibling">
          <img
            alt="Explicit project"
            data-testid="explicit-sibling-source"
            src="/project.png"
          />
        </RouteveilSharedElement>
        <RouteveilLink
          sharedElements="selection-explicit-sibling"
          to="/target"
          transition="fade"
        >
          Open explicit project
        </RouteveilLink>
      </Shell>,
    )

    const source = setRect('explicit-sibling-source', 24, 48)
    fireEvent.click(screen.getByRole('link', {
      name: 'Open explicit project',
    }))

    expect(portalNames()).toEqual(['selection-explicit-sibling'])
    expect(source).toHaveStyle({ visibility: 'hidden' })
  })

  it('does not fall back route-wide when a related source is invalid', () => {
    render(
      <Shell>
        <RouteveilLink to="/target" transition="fade">
          <RouteveilSharedElement name="selection-invalid-related">
            <span data-testid="invalid-link-source">Invalid related source</span>
          </RouteveilSharedElement>
        </RouteveilLink>
        <RouteveilSharedElement name="selection-valid-fallback">
          <span data-testid="valid-link-fallback">Valid fallback source</span>
        </RouteveilSharedElement>
      </Shell>,
    )

    const invalid = screen.getByTestId('invalid-link-source')
    vi.spyOn(invalid, 'getBoundingClientRect').mockReturnValue(rect(10, 20, 0, 0))
    setRect('valid-link-fallback', 200, 20)
    fireEvent.click(screen.getByRole('link'))

    expect(portalNames()).toEqual([])
    expect(screen.getByTestId('valid-link-fallback'))
      .not.toHaveStyle({ visibility: 'hidden' })
  })

  it('selects only valid unique registrations related to a clicked link', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    render(
      <Shell>
        <RouteveilLink to="/target" transition="fade">
          <RouteveilSharedElement name="selection-unique">
            <span data-testid="unique-related">Unique related</span>
          </RouteveilSharedElement>
          <RouteveilSharedElement name="selection-duplicate">
            <span data-testid="duplicate-related-one">Duplicate related one</span>
          </RouteveilSharedElement>
          <RouteveilSharedElement name="selection-duplicate">
            <span data-testid="duplicate-related-two">Duplicate related two</span>
          </RouteveilSharedElement>
        </RouteveilLink>
        <RouteveilSharedElement name="selection-unrelated">
          <span data-testid="unrelated-source">Unrelated source</span>
        </RouteveilSharedElement>
      </Shell>,
    )

    setRect('unique-related', 10, 10)
    setRect('duplicate-related-one', 20, 20)
    setRect('duplicate-related-two', 30, 30)
    setRect('unrelated-source', 40, 40)
    fireEvent.click(screen.getByRole('link'))

    expect(portalNames()).toEqual(['selection-unique'])
    expect(warn.mock.calls.flat().join(' ')).toContain(
      'Multiple outgoing shared elements use the name “selection-duplicate”',
    )
  })

  it('does not infer programmatic intent from the active element', () => {
    render(
      <Shell>
        <RouteveilSharedElement name="selection-active-unrelated">
          <div data-testid="active-unrelated">Unrelated card</div>
        </RouteveilSharedElement>
        <RouteveilSharedElement name="selection-active-related">
          <div data-testid="active-related">
            <ProgrammaticButton label="Navigate from shared card" />
          </div>
        </RouteveilSharedElement>
      </Shell>,
    )

    setRect('active-related', 10, 20)
    setRect('active-unrelated', 200, 20)
    const button = screen.getByRole('button', { name: 'Navigate from shared card' })
    button.focus()
    expect(document.activeElement).toBe(button)
    fireEvent.click(button)

    expect(portalNames()).toEqual([])
  })

  it('does not fall back to unrelated programmatic candidates', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    render(
      <Shell>
        <RouteveilSharedElement name="selection-active-duplicate">
          <div data-testid="active-duplicate-related">
            <ProgrammaticButton label="Navigate from duplicate" />
          </div>
        </RouteveilSharedElement>
        <RouteveilSharedElement name="selection-active-duplicate">
          <div data-testid="active-duplicate-unrelated">
            Duplicate unrelated card
          </div>
        </RouteveilSharedElement>
        <RouteveilSharedElement name="selection-active-unique-unrelated">
          <div data-testid="active-unique-unrelated">
            Unique unrelated card
          </div>
        </RouteveilSharedElement>
      </Shell>,
    )

    setRect('active-duplicate-related', 10, 20)
    setRect('active-duplicate-unrelated', 200, 20)
    setRect('active-unique-unrelated', 390, 20)
    const button = screen.getByRole('button', {
      name: 'Navigate from duplicate',
    })
    button.focus()
    expect(document.activeElement).toBe(button)
    fireEvent.click(button)

    expect(portalNames()).toEqual([])
    expect(browser.animations).toHaveLength(1)
    expect(warn).not.toHaveBeenCalled()
  })

  it('skips an invalid related source and selects a valid unrelated source', () => {
    render(
      <Shell>
        <RouteveilSharedElement name="selection-active-invalid">
          <div data-testid="active-invalid-related">
            <ProgrammaticButton label="Navigate from invalid source" />
          </div>
        </RouteveilSharedElement>
        <RouteveilSharedElement name="selection-valid-unrelated">
          <div data-testid="valid-unrelated">Valid unrelated source</div>
        </RouteveilSharedElement>
      </Shell>,
    )

    const related = screen.getByTestId('active-invalid-related')
    vi.spyOn(related, 'getBoundingClientRect').mockReturnValue(rect(10, 20, 0, 0))
    setRect('valid-unrelated', 200, 20)
    const button = screen.getByRole('button', {
      name: 'Navigate from invalid source',
    })
    button.focus()
    fireEvent.click(button)

    expect(portalNames()).toEqual(['selection-valid-unrelated'])
    expect(browser.animations).toHaveLength(1)
  })

  it('selects a registered element for programmatic navigation outside the view', () => {
    render(
      <Shell controls={<ProgrammaticButton label="Navigate with fallback" />}>
        <RouteveilSharedElement name="selection-single-fallback">
          <section data-testid="single-fallback">Single source</section>
        </RouteveilSharedElement>
      </Shell>,
    )

    setRect('single-fallback', 40, 50)
    const button = screen.getByRole('button', { name: 'Navigate with fallback' })
    button.focus()
    expect(document.activeElement).toBe(button)
    fireEvent.click(button)

    expect(portalNames()).toEqual(['selection-single-fallback'])
  })

  it('does not select ambiguous programmatic candidates by default', () => {
    render(
      <Shell controls={<ProgrammaticButton label="Navigate ambiguously" />}>
        <RouteveilSharedElement name="selection-ambiguous-one">
          <div data-testid="ambiguous-one">First source</div>
        </RouteveilSharedElement>
        <RouteveilSharedElement name="selection-ambiguous-two">
          <div data-testid="ambiguous-two">Second source</div>
        </RouteveilSharedElement>
      </Shell>,
    )

    setRect('ambiguous-one', 10, 10)
    setRect('ambiguous-two', 180, 10)
    const button = screen.getByRole('button', { name: 'Navigate ambiguously' })
    button.focus()
    fireEvent.click(button)

    expect(portalNames()).toEqual([])
    expect(browser.animations).toHaveLength(1)
  })

  it('selects all programmatic candidates when explicitly requested', () => {
    render(
      <Shell controls={(
        <ProgrammaticButton
          label="Navigate with every source"
          sharedElements="all"
        />
      )}>
        <RouteveilSharedElement name="selection-all-one">
          <div data-testid="all-one">First source</div>
        </RouteveilSharedElement>
        <RouteveilSharedElement name="selection-all-two">
          <div data-testid="all-two">Second source</div>
        </RouteveilSharedElement>
      </Shell>,
    )

    setRect('all-one', 10, 10)
    setRect('all-two', 180, 10)
    fireEvent.click(screen.getByRole('button', {
      name: 'Navigate with every source',
    }))

    expect(portalNames()).toEqual([
      'selection-all-one',
      'selection-all-two',
    ])
  })

  it('uses scrollToSharedElement as a programmatic source hint', () => {
    render(
      <Shell controls={(
        <ProgrammaticButton
          label="Navigate to selected source"
          scrollToSharedElement="selection-hinted-two"
        />
      )}>
        <RouteveilSharedElement name="selection-hinted-one">
          <div data-testid="hinted-one">First source</div>
        </RouteveilSharedElement>
        <RouteveilSharedElement name="selection-hinted-two">
          <div data-testid="hinted-two">Second source</div>
        </RouteveilSharedElement>
      </Shell>,
    )

    setRect('hinted-one', 10, 10)
    setRect('hinted-two', 180, 10)
    fireEvent.click(screen.getByRole('button', {
      name: 'Navigate to selected source',
    }))

    expect(portalNames()).toEqual(['selection-hinted-two'])
  })

  it('supports explicit name arrays', () => {
    render(
      <Shell>
        <RouteveilSharedElement name="selection-array-one">
          <div data-testid="array-one">First source</div>
        </RouteveilSharedElement>
        <RouteveilSharedElement name="selection-array-two">
          <div data-testid="array-two">Second source</div>
        </RouteveilSharedElement>
        <RouteveilLink
          aria-label="Open selected sources"
          sharedElements={['selection-array-one', 'selection-array-two']}
          to="/target"
          transition="fade"
        />
      </Shell>,
    )

    setRect('array-one', 10, 10)
    setRect('array-two', 180, 10)
    fireEvent.click(screen.getByRole('link', {
      name: 'Open selected sources',
    }))

    expect(portalNames()).toEqual([
      'selection-array-one',
      'selection-array-two',
    ])
  })

  it('disables an otherwise related shared element explicitly', () => {
    render(
      <Shell>
        <RouteveilLink
          sharedElements={false}
          to="/target"
          transition="fade"
        >
          <RouteveilSharedElement name="selection-disabled">
            <span data-testid="disabled-source">Disabled source</span>
          </RouteveilSharedElement>
        </RouteveilLink>
      </Shell>,
    )

    const source = setRect('disabled-source', 10, 10)
    fireEvent.click(screen.getByRole('link'))

    expect(portalNames()).toEqual([])
    expect(source).not.toHaveStyle({ visibility: 'hidden' })
  })
})
