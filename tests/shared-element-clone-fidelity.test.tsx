import {
  StrictMode,
  useCallback,
  type ReactNode,
} from 'react'
import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
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

function Shell({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <RouteveilProvider>
        <RouteveilView>{children}</RouteveilView>
      </RouteveilProvider>
    </MemoryRouter>
  )
}

function FidelityCard() {
  return (
    <RouteveilSharedElement name="fidelity-card">
      <article
        aria-labelledby="card-title"
        className="fidelity-card"
        data-testid="fidelity-card"
        id="card"
      >
        <h2 id="card-title">Computed title</h2>
        <p className="fidelity-copy">
          <em>Inherited copy</em>
        </p>
        <RouteveilLink to="/target" transition="fade">
          <RouteveilSharedElement name="fidelity-badge">
            <span data-testid="fidelity-badge" id="badge">
              Separate badge
              <strong style={{ visibility: 'visible' }}>
                <i style={{ visibility: 'visible' }}>Separate badge child</i>
              </strong>
            </span>
          </RouteveilSharedElement>
          Open
        </RouteveilLink>
        <form action="/submit" id="card-form" target="_blank">
          <label htmlFor="card-input">Label</label>
          <input
            aria-describedby="card-help"
            defaultValue="initial input"
            form="card-form"
            id="card-input"
            list="card-options"
            name="query"
            type="text"
          />
          <input defaultChecked={false} id="card-check" type="checkbox" />
          <textarea defaultValue="initial textarea" id="card-textarea" />
          <select defaultValue="first" id="card-select">
            <option value="first">First</option>
            <option value="second">Second</option>
          </select>
          <button formAction="/alternate" name="intent" type="submit">
            Submit
          </button>
          <datalist id="card-options">
            <option value="suggestion" />
          </datalist>
          <small id="card-help">Help</small>
        </form>
        <svg aria-label="Visual mark" viewBox="0 0 40 40">
          <defs>
            <linearGradient id="card-gradient">
              <stop offset="0" stopColor="#fff" />
              <stop offset="1" stopColor="#000" />
            </linearGradient>
            <path d="M2 2h10v10H2z" id="card-shape" />
          </defs>
          <rect fill="url(#card-gradient)" height="40" width="40" />
          <use href="#card-shape" />
        </svg>
        <video autoPlay data-testid="card-video" muted>
          <source src="/visual.mp4" srcSet="/visual-2x.mp4 2x" />
        </video>
        <iframe
          src="about:blank"
          srcDoc="<p>frame</p>"
          title="Embedded frame"
        />
        <audio src="/sound.mp3">
          <source src="/sound.ogg" />
        </audio>
        <object data="/document.pdf" title="Object content" />
        <embed src="/embedded.svg" title="Embedded content" />
        <style media="screen">{'.fidelity-side-effect { color: red; }'}</style>
        <script src="/effect.js">{'globalThis.__routeveilEffect = true'}</script>
      </article>
    </RouteveilSharedElement>
  )
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

function CrossfadeCard({ target }: { target: boolean }) {
  const setRect = useCallback((element: HTMLElement | null) => {
    if (element) {
      element.getBoundingClientRect = () => target
        ? rect(180, 60, 240, 160)
        : rect(30, 320, 120, 80)
    }
  }, [target])

  return (
    <RouteveilSharedElement name="computed-crossfade">
      <article
        className={target ? 'signature-target' : 'signature-source'}
        ref={setRect}
      >
        <span>Unchanged descendant</span>
      </article>
    </RouteveilSharedElement>
  )
}

function CrossfadeRoutes() {
  const location = useLocation()

  return (
    <RouteveilProvider>
      <RouteveilView>
        {location.pathname === '/'
          ? (
              <RouteveilLink to="/target" transition="fade">
                <CrossfadeCard target={false} />
              </RouteveilLink>
            )
          : <CrossfadeCard target />}
      </RouteveilView>
    </RouteveilProvider>
  )
}

function StableVisualCard({ target }: { target: boolean }) {
  const setRect = useCallback((element: HTMLElement | null) => {
    if (element) {
      element.getBoundingClientRect = () => target
        ? rect(180, 60, 240, 160)
        : rect(30, 320, 120, 80)
    }
  }, [target])

  return (
    <RouteveilSharedElement name="stable-visual">
      <article
        ref={setRect}
        style={{
          transformOrigin: target ? '120px 80px' : '60px 40px',
        }}
      >
        <span>Same visual</span>
      </article>
    </RouteveilSharedElement>
  )
}

function StableVisualRoutes() {
  const location = useLocation()

  return (
    <RouteveilProvider>
      <RouteveilView>
        {location.pathname === '/'
          ? (
              <RouteveilLink to="/target" transition="fade">
                <StableVisualCard target={false} />
              </RouteveilLink>
            )
          : (
              <RouteveilLink to="/" transition="fade">
                <StableVisualCard target />
              </RouteveilLink>
            )}
      </RouteveilView>
    </RouteveilProvider>
  )
}

const sourceFrame = {
  borderBottomColor: 'rgb(70, 80, 90)',
  borderBottomLeftRadius: '17px',
  borderBottomRightRadius: '18px',
  borderBottomStyle: 'dotted',
  borderBottomWidth: '4px',
  borderLeftColor: 'rgb(100, 110, 120)',
  borderLeftStyle: 'double',
  borderLeftWidth: '5px',
  borderRightColor: 'rgb(40, 50, 60)',
  borderRightStyle: 'dashed',
  borderRightWidth: '3px',
  borderTopColor: 'rgb(10, 20, 30)',
  borderTopLeftRadius: '15px',
  borderTopRightRadius: '16px',
  borderTopStyle: 'solid',
  borderTopWidth: '2px',
} as const

const targetFrame = {
  borderBottomColor: 'rgb(170, 180, 190)',
  borderBottomLeftRadius: '27px',
  borderBottomRightRadius: '28px',
  borderBottomStyle: 'double',
  borderBottomWidth: '8px',
  borderLeftColor: 'rgb(200, 210, 220)',
  borderLeftStyle: 'solid',
  borderLeftWidth: '9px',
  borderRightColor: 'rgb(140, 150, 160)',
  borderRightStyle: 'dotted',
  borderRightWidth: '7px',
  borderTopColor: 'rgb(110, 120, 130)',
  borderTopLeftRadius: '25px',
  borderTopRightRadius: '26px',
  borderTopStyle: 'dashed',
  borderTopWidth: '6px',
} as const

function FramedImage({ target }: { target: boolean }) {
  const setRect = useCallback((element: HTMLImageElement | null) => {
    if (element) {
      element.getBoundingClientRect = () => target
        ? rect(180, 60, 320, 180)
        : rect(30, 320, 160, 90)
    }
  }, [target])

  return (
    <RouteveilSharedElement name="framed-image">
      <img
        alt="Routeveil transition preview"
        data-testid={target ? 'framed-image-target' : 'framed-image-source'}
        ref={setRect}
        src="/shared-frame.png"
        style={{
          ...(target ? targetFrame : sourceFrame),
          display: 'block',
          height: target ? '180px' : '90px',
          objectFit: 'cover',
          width: target ? '320px' : '160px',
        }}
      />
    </RouteveilSharedElement>
  )
}

function FramedImageRoutes() {
  const location = useLocation()

  return (
    <RouteveilProvider>
      <RouteveilView>
        {location.pathname === '/'
          ? (
              <RouteveilLink
                aria-label="Open framed image"
                to="/target"
                transition="fade"
              >
                <FramedImage target={false} />
              </RouteveilLink>
            )
          : <FramedImage target />}
      </RouteveilView>
    </RouteveilProvider>
  )
}

function BidirectionalImage({ route }: { route: 'a' | 'b' }) {
  const target = route === 'b'
  const setRect = useCallback((element: HTMLImageElement | null) => {
    if (element) {
      element.getBoundingClientRect = () => target
        ? rect(40, 80, 600, 338)
        : rect(24, 320, 300, 169)
    }
  }, [target])

  return (
    <RouteveilSharedElement name="direct-image">
      <img
        alt={`Route ${route.toUpperCase()} image`}
        data-testid={`direct-image-${route}`}
        ref={setRect}
        src="/shared-direct-image.png"
        style={{
          borderRadius: target ? '25px' : '15px',
          height: 'auto',
          width: target ? '100%' : '300px',
        }}
      />
    </RouteveilSharedElement>
  )
}

function BidirectionalImageRoutes() {
  const location = useLocation()
  const route = location.pathname === '/b' ? 'b' : 'a'

  return (
    <RouteveilProvider>
      <RouteveilView>
        {route === 'a'
          ? (
              <RouteveilLink
                aria-label="Open route B"
                preventScrollReset
                to="/b"
                transition="fade"
              >
                <BidirectionalImage route="a" />
              </RouteveilLink>
            )
          : (
              <>
                <RouteveilLink
                  aria-label="Return to route A"
                  preventScrollReset
                  sharedElements="direct-image"
                  to="/a"
                  transition="fade"
                >
                  Return
                </RouteveilLink>
                <BidirectionalImage route="b" />
              </>
            )}
      </RouteveilView>
    </RouteveilProvider>
  )
}

const styleMorphValues = {
  a: {
    child: {
      backgroundColor: 'rgb(70, 80, 90)',
      borderRadius: '6px',
      color: 'rgb(100, 110, 120)',
      fontSize: '14px',
      fontWeight: '400',
    },
    root: {
      backgroundColor: 'rgb(10, 20, 30)',
      borderRadius: '12px',
      color: 'rgb(40, 50, 60)',
      fontSize: '16px',
      fontWeight: '400',
    },
  },
  b: {
    child: {
      backgroundColor: 'rgb(170, 180, 190)',
      borderRadius: '18px',
      color: 'rgb(200, 210, 220)',
      fontSize: '24px',
      fontWeight: '700',
    },
    root: {
      backgroundColor: 'rgb(110, 120, 130)',
      borderRadius: '28px',
      color: 'rgb(140, 150, 160)',
      fontSize: '22px',
      fontWeight: '700',
    },
  },
} as const

function StyleMorphCard({ route }: { route: 'a' | 'b' }) {
  const setRect = useCallback((element: HTMLElement | null) => {
    if (element) {
      element.getBoundingClientRect = () => route === 'b'
        ? rect(220, 70, 360, 220)
        : rect(40, 240, 180, 110)
    }
  }, [route])
  const values = styleMorphValues[route]

  return (
    <RouteveilSharedElement name="style-morph-card">
      <article
        data-testid={`style-morph-card-${route}`}
        ref={setRect}
        style={values.root}
      >
        <span
          data-testid={`style-morph-child-${route}`}
          style={values.child}
        >
          Unchanged shared content
        </span>
      </article>
    </RouteveilSharedElement>
  )
}

function StyleMorphRoutes() {
  const location = useLocation()
  const route = location.pathname === '/b' ? 'b' : 'a'

  return (
    <RouteveilProvider>
      <RouteveilView>
        <RouteveilLink
          aria-label={route === 'a' ? 'Morph to route B' : 'Morph to route A'}
          to={route === 'a' ? '/b' : '/a'}
          transition="fade"
        >
          <StyleMorphCard route={route} />
        </RouteveilLink>
      </RouteveilView>
    </RouteveilProvider>
  )
}

const headingMorphValues = {
  a: {
    borderRadius: '0px',
    color: 'rgb(20, 30, 40)',
    fontFamily: 'Arial',
    fontSize: '20px',
    fontStyle: 'normal',
    fontWeight: '400',
    letterSpacing: '0px',
    lineHeight: '24px',
    paddingLeft: '0px',
    textAlign: 'left',
    textTransform: 'none',
  },
  b: {
    borderRadius: '20px',
    color: 'rgb(180, 190, 200)',
    fontFamily: 'Georgia',
    fontSize: '64px',
    fontStyle: 'italic',
    fontWeight: '700',
    letterSpacing: '-2px',
    lineHeight: '68px',
    paddingLeft: '24px',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
} as const

function CrossTagHeading({
  changedText = false,
  route,
}: {
  changedText?: boolean
  route: 'a' | 'b'
}) {
  const setRect = useCallback((element: HTMLElement | null) => {
    if (element) {
      element.getBoundingClientRect = () => route === 'b'
        ? rect(160, 80, 640, 140)
        : rect(40, 300, 320, 52)
    }
  }, [route])
  const content = changedText && route === 'b'
    ? 'Changed destination'
    : 'Shared heading'
  const values = headingMorphValues[route]

  return (
    <RouteveilSharedElement name="cross-tag-heading">
      {route === 'a'
        ? (
            <h3
              data-testid="cross-tag-heading-a"
              ref={setRect}
              style={values}
            >
              {content}
            </h3>
          )
        : (
            <h2
              data-testid="cross-tag-heading-b"
              ref={setRect}
              style={values}
            >
              {content}
            </h2>
          )}
    </RouteveilSharedElement>
  )
}

function CrossTagHeadingRoutes({
  changedText = false,
}: {
  changedText?: boolean
}) {
  const location = useLocation()
  const route = location.pathname === '/b' ? 'b' : 'a'

  return (
    <RouteveilProvider>
      <RouteveilView>
        <RouteveilLink
          aria-label={route === 'a' ? 'Open large heading' : 'Return small heading'}
          to={route === 'a' ? '/b' : '/a'}
          transition="fade"
        >
          <CrossTagHeading changedText={changedText} route={route} />
        </RouteveilLink>
      </RouteveilView>
    </RouteveilProvider>
  )
}

function LabTopologyImage({ route }: { route: 'a' | 'b' }) {
  const setRect = useCallback((element: HTMLImageElement | null) => {
    if (element) {
      element.getBoundingClientRect = () => route === 'b'
        ? rect(140, 110, 700, 394)
        : rect(40, 310, 350, 197)
    }
  }, [route])

  return (
    <RouteveilSharedElement name="lab-hero-img">
      <img
        alt="Routeveil"
        data-testid={`lab-image-${route}`}
        ref={setRect}
        src="/routeveil-readme-hero.png"
        style={{
          borderRadius: '12.5px',
          height: 'auto',
          width: '100%',
        }}
      />
    </RouteveilSharedElement>
  )
}

function LabTopologyText({ route }: { route: 'a' | 'b' }) {
  const setRect = useCallback((element: HTMLDivElement | null) => {
    if (element) {
      element.getBoundingClientRect = () => route === 'b'
        ? rect(140, 516, 700, 110)
        : rect(40, 515, 350, 80)
    }
  }, [route])

  return (
    <RouteveilSharedElement name="lab-hero-text">
      <div
        data-testid={`lab-text-${route}`}
        ref={setRect}
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: route === 'a' ? '0.5rem' : '0',
        }}
      >
        <h2 style={{ fontSize: route === 'a' ? 18 : 24, fontWeight: 500 }}>
          RouteVeil v1
        </h2>
        <p style={{ color: 'rgb(90, 90, 90)', fontSize: 16 }}>
          See what&apos;s new in this release!
        </p>
      </div>
    </RouteveilSharedElement>
  )
}

function LabTopologyRouteA() {
  return (
    <div style={{ width: 350 }}>
      <RouteveilLink
        aria-label="Open lab route B"
        preventScrollReset
        to="/b"
        transition="fade"
      >
        <div>
          <LabTopologyImage route="a" />
          <LabTopologyText route="a" />
        </div>
      </RouteveilLink>
    </div>
  )
}

function LabTopologyRouteB() {
  return (
    <div>
      <RouteveilLink
        aria-label="Return to lab route A"
        preventScrollReset
        sharedElements={['lab-hero-img', 'lab-hero-text']}
        to="/a"
        transition="fade"
      >
        Go
      </RouteveilLink>
      <div
        style={{
          backgroundColor: 'white',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          padding: '1rem',
        }}
      >
        <LabTopologyImage route="b" />
        <LabTopologyText route="b" />
      </div>
    </div>
  )
}

function LabTopologyOutletApp() {
  return (
    <RouteveilProvider>
      <RouteveilView />
    </RouteveilProvider>
  )
}

function LabTopologyLazyRouteA() {
  return <LabTopologyRouteA />
}

function LabTopologyLazyRouteB() {
  return <LabTopologyRouteB />
}

function createLabTopologyRouter() {
  return createMemoryRouter([
    {
      path: '/',
      element: <LabTopologyOutletApp />,
      children: [
        {
          path: 'a',
          lazy: async () => ({ Component: LabTopologyLazyRouteA }),
        },
        {
          path: 'b',
          lazy: async () => ({ Component: LabTopologyLazyRouteB }),
        },
      ],
    },
  ], { initialEntries: ['/a'] })
}

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

function stylePropertyCandidates(property: string): string[] {
  return property === 'borderRadius'
    ? [
        'borderRadius',
        'borderTopLeftRadius',
        'borderTopRightRadius',
        'borderBottomRightRadius',
        'borderBottomLeftRadius',
      ]
    : [property]
}

function expectStyleKeyframes(
  animations: ReturnType<typeof installBrowserMocks>['animations'],
  elements: Element[],
  source: Record<string, string>,
  target: Record<string, string>,
): void {
  for (const property of Object.keys(source)) {
    const candidates = stylePropertyCandidates(property)
    const matchingAnimation = animations.find((animation) => {
      if (!elements.includes(animation.element)) {
        return false
      }

      const frames = animationFrames(animation.keyframes)
      const first = frames[0]
      const last = frames.at(-1)

      return Boolean(first && last && candidates.some((candidate) => (
        frameValue(first, candidate) === source[property]
        && frameValue(last, candidate) === target[property]
      )))
    })

    expect(matchingAnimation, `missing ${property} style morph`).toBeDefined()
  }
}

function expectBaseStyles(
  element: Element,
  values: Record<string, string>,
): void {
  const style = element.ownerDocument.defaultView!.getComputedStyle(element)

  for (const [property, value] of Object.entries(values)) {
    const cssProperty = property.replace(
      /[A-Z]/g,
      (letter) => `-${letter.toLowerCase()}`,
    )
    expect(style.getPropertyValue(cssProperty)).toBe(value)
  }
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
let stylesheet: HTMLStyleElement | null = null

beforeEach(() => {
  browser = installBrowserMocks({ settleAnimationOnCancel: true })
  stylesheet = document.createElement('style')
  stylesheet.textContent = `
    .fidelity-card {
      background-color: rgb(12, 34, 56);
      border: 3px solid rgb(70, 80, 90);
      border-radius: 17px;
      box-shadow: 2px 4px 8px rgb(1, 2, 3);
      color: rgb(210, 220, 230);
      font-family: "Courier New", monospace;
      opacity: 0.82;
      overflow: hidden;
      transform: matrix(2, 0, 0, 2, 0, 0);
      transform-origin: 50% 50%;
    }
    .fidelity-card .fidelity-copy {
      font-size: 19px;
      font-weight: 700;
      line-height: 27px;
    }
    .signature-source span {
      color: rgb(12, 34, 56);
    }
    .signature-target span {
      color: rgb(210, 220, 230);
    }
  `
  document.head.append(stylesheet)
})

afterEach(() => {
  rendered?.unmount()
  rendered = null
  stylesheet?.remove()
  stylesheet = null
  browser.restore()
  vi.restoreAllMocks()
})

describe('shared-element clone fidelity and isolation', () => {
  it('morphs a direct image in both route directions', async () => {
    rendered = render(
      <MemoryRouter initialEntries={['/a']}>
        <BidirectionalImageRoutes />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Open route B' }))
    const forwardExit = browser.animations.find((animation) => (
      animation.status === 'running'
      && animation.element.hasAttribute('data-routeveil-view')
    ))
    expect(forwardExit).toBeDefined()

    await act(async () => {
      forwardExit!.finish()
      await Promise.resolve()
      await Promise.resolve()
    })
    await flushTransitionFrames(4)

    const forwardMovements = browser.animations.filter((animation) => (
      animation.status === 'running'
      && animation.element.closest('[data-routeveil-shared-portal]') !== null
    ))
    const forwardWrapper = portalWrapper('direct-image')
    const forwardClone = requireElement<HTMLImageElement>(forwardWrapper, 'img')
    const forwardGeometry = forwardMovements.find((animation) => (
      animation.element === forwardWrapper
    ))
    expect(forwardWrapper.children).toHaveLength(1)
    expect(forwardMovements.every((animation) => (
      animation.element === forwardWrapper
      || animation.element === forwardClone
    ))).toBe(true)
    expect(forwardMovements.every((animation) => (
      animationFrames(animation.keyframes).every((frame) => (
        frameValue(frame, 'opacity') === undefined
      ))
    ))).toBe(true)
    expect(animationFrames(forwardGeometry!.keyframes)).toEqual([
      {
        borderRadius: '15px',
        height: '169px',
        left: '24px',
        top: '320px',
        width: '300px',
      },
      {
        borderRadius: '25px',
        height: '338px',
        left: '40px',
        top: '80px',
        width: '600px',
      },
    ])

    await act(async () => {
      for (const animation of forwardMovements) {
        animation.finish()
      }

      for (let index = 0; index < 6; index += 1) {
        await Promise.resolve()
      }
    })

    const forwardEnter = browser.animations.find((animation) => (
      animation.status === 'running'
      && animation.element.hasAttribute('data-routeveil-view')
    ))
    expect(forwardEnter).toBeDefined()

    await act(async () => {
      forwardEnter!.finish()

      for (let index = 0; index < 6; index += 1) {
        await Promise.resolve()
      }
    })
    await flushTransitionFrames(2)

    expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
    expect(screen.getByTestId('direct-image-b').style.visibility).toBe('')

    fireEvent.click(screen.getByRole('link', { name: 'Return to route A' }))
    const reverseExit = browser.animations.find((animation) => (
      animation.status === 'running'
      && animation.element.hasAttribute('data-routeveil-view')
    ))
    expect(reverseExit).toBeDefined()
    expect(portalWrapper('direct-image').children).toHaveLength(1)

    await act(async () => {
      reverseExit!.finish()
      await Promise.resolve()
      await Promise.resolve()
    })
    await flushTransitionFrames(4)

    const reverseWrapper = portalWrapper('direct-image')
    const reverseClone = requireElement<HTMLImageElement>(reverseWrapper, 'img')
    const reverseMovements = browser.animations.filter((animation) => (
      animation.status === 'running'
      && animation.element.closest('[data-routeveil-shared-portal]') !== null
    ))
    const reverseGeometry = reverseMovements.find((animation) => (
      animation.element === reverseWrapper
    ))

    expect(reverseWrapper.children).toHaveLength(1)
    expect(reverseClone.style.opacity).toBe('1')
    expect(reverseMovements.every((animation) => (
      animation.element === reverseWrapper
      || animation.element === reverseClone
    ))).toBe(true)
    expect(reverseMovements.every((animation) => (
      animationFrames(animation.keyframes).every((frame) => (
        frameValue(frame, 'opacity') === undefined
      ))
    ))).toBe(true)
    expect(animationFrames(reverseGeometry!.keyframes)).toEqual([
      {
        borderRadius: '25px',
        height: '338px',
        left: '40px',
        top: '80px',
        width: '600px',
      },
      {
        borderRadius: '15px',
        height: '169px',
        left: '24px',
        top: '320px',
        width: '300px',
      },
    ])

    await act(async () => {
      for (const animation of reverseMovements) {
        animation.finish()
      }

      for (let index = 0; index < 6; index += 1) {
        await Promise.resolve()
      }
    })

    const reverseEnter = browser.animations.find((animation) => (
      animation.status === 'running'
      && animation.element.hasAttribute('data-routeveil-view')
    ))
    expect(reverseEnter).toBeDefined()

    await act(async () => {
      reverseEnter!.finish()

      for (let index = 0; index < 6; index += 1) {
        await Promise.resolve()
      }
    })
    await flushTransitionFrames(2)

    expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
    expect(screen.getByTestId('direct-image-a').style.visibility).toBe('')
  })

  it('smoothly morphs root and descendant styles in both directions', async () => {
    rendered = render(
      <MemoryRouter initialEntries={['/a']}>
        <StyleMorphRoutes />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Morph to route B' }))
    const forwardExit = browser.animations.find((animation) => (
      animation.status === 'running'
      && animation.element.hasAttribute('data-routeveil-view')
    ))
    expect(forwardExit).toBeDefined()

    await act(async () => {
      forwardExit!.finish()
      await Promise.resolve()
      await Promise.resolve()
    })
    await flushTransitionFrames(4)

    const forwardWrapper = portalWrapper('style-morph-card')
    const forwardClone = requireElement<HTMLElement>(forwardWrapper, 'article')
    const forwardChild = requireElement<HTMLElement>(forwardClone, 'span')
    const forwardAnimations = browser.animations.filter((animation) => (
      animation.status === 'running'
      && animation.element.closest('[data-routeveil-shared-portal]') !== null
    ))

    expect(forwardWrapper.children).toHaveLength(1)
    expectNoOpacityCrossfade(forwardAnimations)
    expectStyleKeyframes(
      forwardAnimations,
      [forwardWrapper, forwardClone],
      styleMorphValues.a.root,
      styleMorphValues.b.root,
    )
    expectStyleKeyframes(
      forwardAnimations,
      [forwardChild],
      styleMorphValues.a.child,
      styleMorphValues.b.child,
    )

    await act(async () => {
      for (const animation of forwardAnimations) {
        animation.finish()
      }

      for (let index = 0; index < 6; index += 1) {
        await Promise.resolve()
      }
    })

    const forwardEnter = browser.animations.find((animation) => (
      animation.status === 'running'
      && animation.element.hasAttribute('data-routeveil-view')
    ))
    expect(forwardEnter).toBeDefined()
    expect(document.querySelector('[data-routeveil-shared-portal]'))
      .not.toBeNull()
    expect(forwardWrapper.children).toHaveLength(1)
    expectBaseStyles(forwardClone, styleMorphValues.a.root)
    expectBaseStyles(forwardChild, styleMorphValues.a.child)

    await act(async () => {
      forwardEnter!.finish()

      for (let index = 0; index < 6; index += 1) {
        await Promise.resolve()
      }
    })
    await flushTransitionFrames(2)

    expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
    expect(screen.getByTestId('style-morph-card-b').style.visibility).toBe('')

    fireEvent.click(screen.getByRole('link', { name: 'Morph to route A' }))
    const reverseExit = browser.animations.find((animation) => (
      animation.status === 'running'
      && animation.element.hasAttribute('data-routeveil-view')
    ))
    expect(reverseExit).toBeDefined()

    await act(async () => {
      reverseExit!.finish()
      await Promise.resolve()
      await Promise.resolve()
    })
    await flushTransitionFrames(4)

    const reverseWrapper = portalWrapper('style-morph-card')
    const reverseClone = requireElement<HTMLElement>(reverseWrapper, 'article')
    const reverseChild = requireElement<HTMLElement>(reverseClone, 'span')
    const reverseAnimations = browser.animations.filter((animation) => (
      animation.status === 'running'
      && animation.element.closest('[data-routeveil-shared-portal]') !== null
    ))

    expect(reverseWrapper.children).toHaveLength(1)
    expectNoOpacityCrossfade(reverseAnimations)
    expectStyleKeyframes(
      reverseAnimations,
      [reverseWrapper, reverseClone],
      styleMorphValues.b.root,
      styleMorphValues.a.root,
    )
    expectStyleKeyframes(
      reverseAnimations,
      [reverseChild],
      styleMorphValues.b.child,
      styleMorphValues.a.child,
    )

    await act(async () => {
      for (const animation of reverseAnimations) {
        animation.finish()
      }

      for (let index = 0; index < 6; index += 1) {
        await Promise.resolve()
      }
    })

    const reverseEnter = browser.animations.find((animation) => (
      animation.status === 'running'
      && animation.element.hasAttribute('data-routeveil-view')
    ))
    expect(reverseEnter).toBeDefined()
    expect(document.querySelector('[data-routeveil-shared-portal]'))
      .not.toBeNull()
    expect(reverseWrapper.children).toHaveLength(1)
    expectBaseStyles(reverseClone, styleMorphValues.b.root)
    expectBaseStyles(reverseChild, styleMorphValues.b.child)

    await act(async () => {
      reverseEnter!.finish()

      for (let index = 0; index < 6; index += 1) {
        await Promise.resolve()
      }
    })
    await flushTransitionFrames(2)

    expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
    expect(screen.getByTestId('style-morph-card-a').style.visibility).toBe('')
  })

  it('morphs equivalent heading tags and all supported styles both ways', async () => {
    rendered = render(
      <MemoryRouter initialEntries={['/a']}>
        <CrossTagHeadingRoutes />
      </MemoryRouter>,
    )

    const finishExit = async () => {
      const exit = browser.animations.find((animation) => (
        animation.status === 'running'
        && animation.element.hasAttribute('data-routeveil-view')
      ))

      expect(exit).toBeDefined()

      await act(async () => {
        exit!.finish()
        await Promise.resolve()
        await Promise.resolve()
      })
      await flushTransitionFrames(4)
    }
    const finishMovement = async () => {
      const animations = browser.animations.filter((animation) => (
        animation.status === 'running'
        && animation.element.closest('[data-routeveil-shared-portal]') !== null
      ))

      await act(async () => {
        for (const animation of animations) {
          animation.finish()
        }

        for (let index = 0; index < 6; index += 1) {
          await Promise.resolve()
        }
      })

      return animations
    }
    const finishEnter = async () => {
      const enter = browser.animations.find((animation) => (
        animation.status === 'running'
        && animation.element.hasAttribute('data-routeveil-view')
      ))

      expect(enter).toBeDefined()

      await act(async () => {
        enter!.finish()

        for (let index = 0; index < 6; index += 1) {
          await Promise.resolve()
        }
      })
      await flushTransitionFrames(2)
    }

    fireEvent.click(screen.getByRole('link', { name: 'Open large heading' }))
    await finishExit()

    const forwardWrapper = portalWrapper('cross-tag-heading')
    const forwardClone = requireElement<HTMLElement>(forwardWrapper, 'h3')
    const forwardAnimations = browser.animations.filter((animation) => (
      animation.status === 'running'
      && animation.element.closest('[data-routeveil-shared-portal]') !== null
    ))

    expect(forwardWrapper.children).toHaveLength(1)
    expectNoOpacityCrossfade(forwardAnimations)
    expectStyleKeyframes(
      forwardAnimations,
      [forwardWrapper, forwardClone],
      headingMorphValues.a,
      headingMorphValues.b,
    )
    await finishMovement()

    expect(document.querySelector('[data-routeveil-shared-portal]'))
      .not.toBeNull()
    expect(forwardClone.tagName).toBe('H3')
    expectBaseStyles(forwardClone, headingMorphValues.a)
    await finishEnter()

    expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
    expect(screen.getByTestId('cross-tag-heading-b').tagName).toBe('H2')
    expect(screen.getByTestId('cross-tag-heading-b').style.visibility).toBe('')

    fireEvent.click(screen.getByRole('link', { name: 'Return small heading' }))
    await finishExit()

    const reverseWrapper = portalWrapper('cross-tag-heading')
    const reverseClone = requireElement<HTMLElement>(reverseWrapper, 'h2')
    const reverseAnimations = browser.animations.filter((animation) => (
      animation.status === 'running'
      && animation.element.closest('[data-routeveil-shared-portal]') !== null
    ))

    expect(reverseWrapper.children).toHaveLength(1)
    expectNoOpacityCrossfade(reverseAnimations)
    expectStyleKeyframes(
      reverseAnimations,
      [reverseWrapper, reverseClone],
      headingMorphValues.b,
      headingMorphValues.a,
    )
    await finishMovement()

    expect(document.querySelector('[data-routeveil-shared-portal]'))
      .not.toBeNull()
    expect(reverseClone.tagName).toBe('H2')
    expectBaseStyles(reverseClone, headingMorphValues.b)
    await finishEnter()

    expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
    expect(screen.getByTestId('cross-tag-heading-a').tagName).toBe('H3')
    expect(screen.getByTestId('cross-tag-heading-a').style.visibility).toBe('')
  })

  it('crossfades heading tags when their visual content changes', async () => {
    rendered = render(
      <MemoryRouter initialEntries={['/a']}>
        <CrossTagHeadingRoutes changedText />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Open large heading' }))
    const exit = browser.animations.find((animation) => (
      animation.status === 'running'
      && animation.element.hasAttribute('data-routeveil-view')
    ))

    expect(exit).toBeDefined()

    await act(async () => {
      exit!.finish()
      await Promise.resolve()
      await Promise.resolve()
    })
    await flushTransitionFrames(4)

    const wrapper = portalWrapper('cross-tag-heading')
    const animations = browser.animations.filter((animation) => (
      animation.status === 'running'
      && animation.element.closest('[data-routeveil-shared-portal]') !== null
    ))
    const opacityAnimations = animations.filter((animation) => (
      animationFrames(animation.keyframes).some((frame) => (
        frameValue(frame, 'opacity') !== undefined
      ))
    ))

    expect(wrapper.children).toHaveLength(2)
    expect(opacityAnimations).toHaveLength(2)
  })

  it('moves both lab shared elements when the reverse link is a sibling', async () => {
    const router = createLabTopologyRouter()

    rendered = render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    )

    const finishExit = async () => {
      const exit = browser.animations.find((animation) => (
        animation.status === 'running'
        && animation.element.hasAttribute('data-routeveil-view')
      ))

      expect(exit).toBeDefined()

      await act(async () => {
        exit!.finish()
        await Promise.resolve()
        await Promise.resolve()
      })
      await flushTransitionFrames(4)
    }
    const finishSharedAndEnter = async () => {
      const sharedAnimations = browser.animations.filter((animation) => (
        animation.status === 'running'
        && animation.element.closest('[data-routeveil-shared-portal]') !== null
      ))

      expect(sharedAnimations.length).toBeGreaterThanOrEqual(2)

      await act(async () => {
        for (const animation of sharedAnimations) {
          animation.finish()
        }

        for (let index = 0; index < 6; index += 1) {
          await Promise.resolve()
        }
      })

      const enter = browser.animations.find((animation) => (
        animation.status === 'running'
        && animation.element.hasAttribute('data-routeveil-view')
      ))

      expect(enter).toBeDefined()

      await act(async () => {
        enter!.finish()

        for (let index = 0; index < 6; index += 1) {
          await Promise.resolve()
        }
      })
      await flushTransitionFrames(2)
    }

    fireEvent.click(await screen.findByRole('link', {
      name: 'Open lab route B',
    }))
    await finishExit()

    const forwardImageWrapper = portalWrapper('lab-hero-img')
    const forwardTextWrapper = portalWrapper('lab-hero-text')
    const forwardAnimations = browser.animations.filter((animation) => (
      animation.status === 'running'
      && animation.element.closest('[data-routeveil-shared-portal]') !== null
    ))
    const forwardImageMovement = forwardAnimations.find((animation) => (
      animation.element === forwardImageWrapper
    ))
    const forwardTextMovement = forwardAnimations.find((animation) => (
      animation.element === forwardTextWrapper
    ))

    expect(animationFrames(forwardImageMovement!.keyframes)).toEqual([
      {
        borderRadius: '12.5px',
        height: '197px',
        left: '40px',
        top: '310px',
        width: '350px',
      },
      {
        borderRadius: '12.5px',
        height: '394px',
        left: '140px',
        top: '110px',
        width: '700px',
      },
    ])
    expect(animationFrames(forwardTextMovement!.keyframes)).toEqual([
      {
        borderRadius: '0px',
        height: '80px',
        left: '40px',
        top: '515px',
        width: '350px',
      },
      {
        borderRadius: '0px',
        height: '110px',
        left: '140px',
        top: '516px',
        width: '700px',
      },
    ])
    await finishSharedAndEnter()

    fireEvent.click(screen.getByRole('link', { name: 'Return to lab route A' }))
    await finishExit()

    const reverseImageWrapper = portalWrapper('lab-hero-img')
    const reverseTextWrapper = portalWrapper('lab-hero-text')
    const reverseAnimations = browser.animations.filter((animation) => (
      animation.status === 'running'
      && animation.element.closest('[data-routeveil-shared-portal]') !== null
    ))
    const reverseImageMovement = reverseAnimations.find((animation) => (
      animation.element === reverseImageWrapper
    ))
    const reverseTextMovement = reverseAnimations.find((animation) => (
      animation.element === reverseTextWrapper
    ))

    expect(animationFrames(reverseImageMovement!.keyframes)).toEqual([
      {
        borderRadius: '12.5px',
        height: '394px',
        left: '140px',
        top: '110px',
        width: '700px',
      },
      {
        borderRadius: '12.5px',
        height: '197px',
        left: '40px',
        top: '310px',
        width: '350px',
      },
    ])
    expect(animationFrames(reverseTextMovement!.keyframes)).toEqual([
      {
        borderRadius: '0px',
        height: '110px',
        left: '140px',
        top: '516px',
        width: '700px',
      },
      {
        borderRadius: '0px',
        height: '80px',
        left: '40px',
        top: '515px',
        width: '350px',
      },
    ])
    await finishSharedAndEnter()

    expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
    expect(screen.getByTestId('lab-image-a').style.visibility).toBe('')
    expect(screen.getByTestId('lab-text-a').style.visibility).toBe('')
  })

  it('morphs a direct image frame without crossfading or flashing', async () => {
    rendered = render(
      <MemoryRouter>
        <FramedImageRoutes />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Open framed image' }))
    const exit = browser.animations.find((animation) => (
      animation.status === 'running'
      && animation.element.hasAttribute('data-routeveil-view')
    ))
    expect(exit).toBeDefined()

    await act(async () => {
      exit!.finish()
      await Promise.resolve()
      await Promise.resolve()
    })
    await flushTransitionFrames(4)

    const wrapper = portalWrapper('framed-image')
    const clone = requireElement<HTMLImageElement>(wrapper, 'img')
    const runningPortalAnimations = browser.animations.filter((animation) => (
      animation.status === 'running'
      && animation.element.closest('[data-routeveil-shared-portal]') !== null
    ))
    const geometryAnimation = runningPortalAnimations.find((animation) => (
      animation.element === wrapper
    ))
    const frameAnimation = runningPortalAnimations.find((animation) => (
      animation.element === clone
    ))

    expect(wrapper.children).toHaveLength(1)
    expect(geometryAnimation).toBeDefined()
    expect(frameAnimation).toBeDefined()
    expect(runningPortalAnimations).toHaveLength(2)

    const frames = animationFrames(frameAnimation!.keyframes)
    expect(frames).toHaveLength(2)

    for (const property of Object.keys(sourceFrame)) {
      expect(frameValue(frames[0]!, property)).toBe(sourceFrame[
        property as keyof typeof sourceFrame
      ])
      expect(frameValue(frames[1]!, property)).toBe(targetFrame[
        property as keyof typeof targetFrame
      ])
    }

    for (const animation of runningPortalAnimations) {
      for (const frame of animationFrames(animation.keyframes)) {
        expect(frameValue(frame, 'opacity')).toBeUndefined()
      }
    }

    await act(async () => {
      for (const animation of runningPortalAnimations) {
        animation.finish()
      }

      for (let index = 0; index < 6; index += 1) {
        await Promise.resolve()
      }
    })

    const enter = browser.animations.find((animation) => (
      animation.status === 'running'
      && animation.element.hasAttribute('data-routeveil-view')
    ))
    expect(enter).toBeDefined()
    expect(document.querySelector('[data-routeveil-shared-portal]'))
      .not.toBeNull()
    expect(wrapper.children).toHaveLength(1)

    for (const [property, value] of Object.entries(sourceFrame)) {
      expect(clone.style[property as keyof CSSStyleDeclaration]).toBe(value)
    }

    await act(async () => {
      enter!.finish()

      for (let index = 0; index < 6; index += 1) {
        await Promise.resolve()
      }
    })
    await flushTransitionFrames(2)

    expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
    expect(screen.getByTestId('framed-image-target').style.visibility).toBe('')
  })

  it('preserves visual state while neutralizing semantics and side effects', () => {
    rendered = render(
      <Shell>
        <FidelityCard />
      </Shell>,
    )

    const source = screen.getByTestId('fidelity-card')
    const badge = screen.getByTestId('fidelity-badge')
    vi.spyOn(source, 'getBoundingClientRect')
      .mockReturnValue(rect(24, 36, 420, 520))
    vi.spyOn(badge, 'getBoundingClientRect')
      .mockReturnValue(rect(48, 112, 120, 32))
    Object.defineProperty(source, 'offsetWidth', {
      configurable: true,
      value: 210,
    })
    Object.defineProperty(source, 'offsetHeight', {
      configurable: true,
      value: 260,
    })

    const textInput = requireElement<HTMLInputElement>(
      source,
      'input[type="text"]',
    )
    const checkbox = requireElement<HTMLInputElement>(
      source,
      'input[type="checkbox"]',
    )
    const textarea = requireElement<HTMLTextAreaElement>(source, 'textarea')
    const select = requireElement<HTMLSelectElement>(source, 'select')
    textInput.value = 'current input'
    checkbox.checked = true
    checkbox.indeterminate = true
    textarea.value = 'current textarea'
    select.value = 'second'
    source.setAttribute('onclick', 'globalThis.__clicked = true')
    textInput.setAttribute('oninput', 'globalThis.__input = true')

    const sourceStyle = window.getComputedStyle(source)
    const sourceCopy = requireElement<HTMLElement>(source, '.fidelity-copy')
    const sourceEmphasis = requireElement<HTMLElement>(source, 'em')
    const expectedStyles = {
      backgroundColor: sourceStyle.backgroundColor,
      borderBottomColor: sourceStyle.borderBottomColor,
      borderBottomWidth: sourceStyle.borderBottomWidth,
      borderRadius: sourceStyle.borderRadius,
      boxShadow: sourceStyle.boxShadow,
      color: sourceStyle.color,
      fontFamily: sourceStyle.fontFamily,
      opacity: sourceStyle.opacity,
      overflow: sourceStyle.overflow,
      transform: sourceStyle.transform,
    }
    const expectedCopyStyles = {
      color: window.getComputedStyle(sourceCopy).color,
      fontFamily: window.getComputedStyle(sourceCopy).fontFamily,
      fontSize: window.getComputedStyle(sourceCopy).fontSize,
      fontWeight: window.getComputedStyle(sourceCopy).fontWeight,
      lineHeight: window.getComputedStyle(sourceCopy).lineHeight,
    }
    const expectedInheritedColor = window.getComputedStyle(sourceEmphasis).color

    fireEvent.click(screen.getByRole('link', { name: /open/i }))

    const portal = requireElement<HTMLElement>(
      document,
      '[data-routeveil-shared-portal]',
    )
    const outerWrapper = portalWrapper('fidelity-card')
    const badgeWrapper = portalWrapper('fidelity-badge')
    const clone = requireElement<HTMLElement>(outerWrapper, 'article')
    const cloneCopy = requireElement<HTMLElement>(clone, 'p')
    const cloneEmphasis = requireElement<HTMLElement>(clone, 'em')

    expect(clone.style.backgroundColor).toBe(expectedStyles.backgroundColor)
    expect(clone.style.borderBottomColor).toBe(
      expectedStyles.borderBottomColor,
    )
    expect(clone.style.borderBottomWidth).toBe(
      expectedStyles.borderBottomWidth,
    )
    expect(clone.style.borderRadius).toBe(expectedStyles.borderRadius)
    expect(clone.style.boxShadow).toBe(expectedStyles.boxShadow)
    expect(clone.style.color).toBe(expectedStyles.color)
    expect(clone.style.fontFamily).toBe(expectedStyles.fontFamily)
    expect(clone.style.opacity).toBe(expectedStyles.opacity)
    expect(clone.style.overflow).toBe(expectedStyles.overflow)
    expect(clone.style.transform).toBe(expectedStyles.transform)
    expect(outerWrapper).toHaveStyle({
      height: '520px',
      width: '420px',
    })
    expect(clone.style.getPropertyValue('left')).toBe('25%')
    expect(clone.style.getPropertyValue('top')).toBe('25%')
    expect(clone.style.getPropertyValue('width')).toBe('50%')
    expect(clone.style.getPropertyValue('height')).toBe('50%')
    expect(clone.style.getPropertyValue('transform'))
      .toBe('matrix(2, 0, 0, 2, 0, 0)')
    expect(clone.style.getPropertyValue('transform-origin')).toBe('50% 50%')
    expect(window.getComputedStyle(cloneCopy).color).toBe(
      expectedCopyStyles.color,
    )
    expect(window.getComputedStyle(cloneCopy).fontFamily).toBe(
      expectedCopyStyles.fontFamily,
    )
    expect(cloneCopy.style.fontSize).toBe(expectedCopyStyles.fontSize)
    expect(cloneCopy.style.fontWeight).toBe(expectedCopyStyles.fontWeight)
    expect(cloneCopy.style.lineHeight).toBe(expectedCopyStyles.lineHeight)
    expect(window.getComputedStyle(cloneEmphasis).color)
      .toBe(expectedInheritedColor)

    const cloneTextInput = requireElement<HTMLInputElement>(
      clone,
      'input[type="text"]',
    )
    const cloneCheckbox = requireElement<HTMLInputElement>(
      clone,
      'input[type="checkbox"]',
    )
    const cloneTextarea = requireElement<HTMLTextAreaElement>(clone, 'textarea')
    const cloneSelect = requireElement<HTMLSelectElement>(clone, 'select')
    expect(cloneTextInput.value).toBe('current input')
    expect(cloneCheckbox.checked).toBe(true)
    expect(cloneCheckbox.indeterminate).toBe(true)
    expect(cloneTextarea.value).toBe('current textarea')
    expect(cloneTextarea.textContent).toBe('current textarea')
    expect(cloneSelect.value).toBe('second')

    const originalIds = [
      'badge',
      'card',
      'card-check',
      'card-form',
      'card-gradient',
      'card-help',
      'card-input',
      'card-options',
      'card-select',
      'card-shape',
      'card-textarea',
      'card-title',
    ]
    const cloneIds = [...clone.querySelectorAll<HTMLElement>('[id]'), clone]
      .map((element) => element.id)
      .filter(Boolean)
    expect(cloneIds).toHaveLength(originalIds.length)
    expect(new Set(cloneIds).size).toBe(cloneIds.length)
    expect(cloneIds.every((id) => (
      id.startsWith('routeveil-shared-clone-')
      && !originalIds.includes(id)
    ))).toBe(true)

    for (const id of originalIds) {
      expect(document.querySelectorAll(`[id="${id}"]`)).toHaveLength(1)
    }

    const cloneGradient = requireElement<SVGLinearGradientElement>(
      clone,
      'linearGradient',
    )
    const cloneShape = requireElement<SVGPathElement>(clone, 'path')
    const cloneRect = requireElement<SVGRectElement>(clone, 'rect')
    const cloneUse = requireElement<SVGUseElement>(clone, 'use')
    expect(cloneRect.getAttribute('fill')).toBe(
      `url(#${cloneGradient.id})`,
    )
    expect(cloneUse.getAttribute('href')).toBe(`#${cloneShape.id}`)

    expect(clone.querySelector('[onclick], [oninput]')).toBeNull()
    expect(requireElement(clone, 'a')).not.toHaveAttribute('href')
    expect(requireElement(clone, 'label')).not.toHaveAttribute('for')
    expect(requireElement(clone, 'form')).not.toHaveAttribute('action')
    expect(requireElement(clone, 'form')).not.toHaveAttribute('target')
    expect(cloneTextInput).not.toHaveAttribute('aria-describedby')
    expect(cloneTextInput).not.toHaveAttribute('form')
    expect(cloneTextInput).not.toHaveAttribute('list')
    expect(cloneTextInput).not.toHaveAttribute('name')
    expect(requireElement(clone, 'button')).not.toHaveAttribute('formaction')
    expect(requireElement(clone, 'button')).not.toHaveAttribute('name')
    expect(clone).not.toHaveAttribute('aria-labelledby')
    expect(clone.querySelector('[class]')).toBeNull()

    expect(portal).toHaveAttribute('aria-hidden', 'true')
    expect(portal.inert).toBe(true)
    expect(portal).toHaveStyle({ pointerEvents: 'none' })
    expect(outerWrapper).not.toHaveAttribute('aria-hidden')
    expect(outerWrapper).not.toHaveAttribute('inert')
    expect(outerWrapper).toHaveStyle({ pointerEvents: 'none' })
    expect(clone).not.toHaveAttribute('role')

    for (const element of [clone, ...clone.querySelectorAll('*')]) {
      expect(element).not.toHaveAttribute('aria-hidden')
      expect(element).not.toHaveAttribute('inert')
      expect(element).toHaveAttribute('tabindex', '-1')
      expect((element as HTMLElement | SVGElement).style.pointerEvents)
        .toBe('none')
    }

    expect(cloneTextInput.disabled).toBe(true)
    expect(cloneCheckbox.disabled).toBe(true)
    expect(cloneTextarea.disabled).toBe(true)
    expect(cloneSelect.disabled).toBe(true)
    expect(requireElement<HTMLButtonElement>(clone, 'button').disabled)
      .toBe(true)

    const cloneVideo = requireElement<HTMLVideoElement>(clone, 'video')
    expect(cloneVideo.muted).toBe(true)
    expect(cloneVideo.defaultMuted).toBe(true)
    expect(cloneVideo.autoplay).toBe(false)
    expect(cloneVideo).not.toHaveAttribute('autoplay')

    const cloneIframe = requireElement<HTMLIFrameElement>(clone, 'iframe')
    const cloneAudio = requireElement<HTMLAudioElement>(clone, 'audio')
    const cloneObject = requireElement<HTMLObjectElement>(clone, 'object')
    const cloneEmbed = requireElement<HTMLEmbedElement>(clone, 'embed')
    const cloneSources = [...clone.querySelectorAll<HTMLSourceElement>(
      'source',
    )]
    const cloneStyle = requireElement<HTMLStyleElement>(clone, 'style')
    const cloneScript = requireElement<HTMLScriptElement>(clone, 'script')
    expect(cloneIframe).not.toHaveAttribute('src')
    expect(cloneIframe).not.toHaveAttribute('srcdoc')
    expect(cloneAudio).not.toHaveAttribute('src')
    expect(cloneObject).not.toHaveAttribute('data')
    expect(cloneEmbed).not.toHaveAttribute('src')
    expect(cloneSources).not.toHaveLength(0)

    for (const sourceElement of cloneSources) {
      expect(sourceElement).not.toHaveAttribute('src')
      expect(sourceElement).not.toHaveAttribute('srcset')
    }

    expect(cloneStyle.textContent).toBe('')
    expect(cloneScript).not.toHaveAttribute('src')
    expect(cloneScript.textContent).toBe('')

    const nestedInsideOuter = [...clone.querySelectorAll('span')]
      .find((element) => element.textContent?.startsWith('Separate badge'))
    const standaloneNested = [...badgeWrapper.querySelectorAll('span')]
      .find((element) => element.textContent?.startsWith('Separate badge'))
    expect(nestedInsideOuter).toBeDefined()
    const nestedOuterTree = [
      nestedInsideOuter!,
      ...nestedInsideOuter!.querySelectorAll('*'),
    ]

    for (const element of nestedOuterTree) {
      expect((element as HTMLElement | SVGElement).style
        .getPropertyValue('visibility')).toBe('hidden')
      expect((element as HTMLElement | SVGElement).style
        .getPropertyPriority('visibility')).toBe('important')
    }

    expect(standaloneNested).toBeDefined()
    expect(standaloneNested!.style.getPropertyValue('visibility'))
      .not.toBe('hidden')
    expect(
      [nestedInsideOuter, standaloneNested].filter((element) => (
        element
        && element.style.getPropertyValue('visibility') !== 'hidden'
      )),
    ).toHaveLength(1)

    expect(browser.animations.some((animation) => (
      animation.element.hasAttribute('data-routeveil-view')
    ))).toBe(true)
  })

  it('morphs same-tag cards when only descendant computed styles differ', async () => {
    rendered = render(
      <MemoryRouter>
        <CrossfadeRoutes />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link'))
    const exit = browser.animations.find((animation) => (
      animation.status === 'running'
      && animation.element.hasAttribute('data-routeveil-view')
    ))
    expect(exit).toBeDefined()

    await act(async () => {
      exit!.finish()
      await Promise.resolve()
      await Promise.resolve()
    })
    await flushTransitionFrames(4)

    const wrapper = portalWrapper('computed-crossfade')
    const visuals = [...wrapper.children]
    const clone = visuals[0]
    const descendant = requireElement(clone, 'span')
    const runningPortalAnimations = browser.animations.filter((animation) => (
      animation.status === 'running'
      && animation.element.closest('[data-routeveil-shared-portal]') !== null
    ))
    expect(visuals).toHaveLength(1)
    expectNoOpacityCrossfade(runningPortalAnimations)
    expectStyleKeyframes(
      runningPortalAnimations,
      [descendant],
      { color: 'rgb(12, 34, 56)' },
      { color: 'rgb(210, 220, 230)' },
    )
  })

  it('keeps one clone when only an unused transform origin changes', async () => {
    rendered = render(
      <MemoryRouter>
        <StableVisualRoutes />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link'))
    const exit = browser.animations.find((animation) => (
      animation.status === 'running'
      && animation.element.hasAttribute('data-routeveil-view')
    ))
    expect(exit).toBeDefined()

    await act(async () => {
      exit!.finish()
      await Promise.resolve()
      await Promise.resolve()
    })
    await flushTransitionFrames(4)

    const wrapper = portalWrapper('stable-visual')
    const runningPortalAnimations = browser.animations.filter((animation) => (
      animation.status === 'running'
      && animation.element.closest('[data-routeveil-shared-portal]') !== null
    ))

    expect(wrapper.children).toHaveLength(1)
    expect(runningPortalAnimations).toHaveLength(1)
    expect(runningPortalAnimations[0]?.element).toBe(wrapper)
  })

  it('skips a source hidden by an opacity-zero ancestor', () => {
    rendered = render(
      <Shell>
        <div style={{ opacity: 0 }}>
          <RouteveilLink to="/target" transition="fade">
            <RouteveilSharedElement name="invisible-source">
              <span data-testid="invisible-source">Invisible source</span>
            </RouteveilSharedElement>
          </RouteveilLink>
        </div>
      </Shell>,
    )

    const source = screen.getByTestId('invisible-source')
    vi.spyOn(source, 'getBoundingClientRect')
      .mockReturnValue(rect(20, 30, 120, 40))
    fireEvent.click(screen.getByRole('link'))

    expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
    expect(browser.animations.some((animation) => (
      animation.element.hasAttribute('data-routeveil-view')
    ))).toBe(true)
  })
})
