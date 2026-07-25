import {
  StrictMode,
  createRef,
  forwardRef,
  useState,
} from 'react'
import type { ReactNode, Ref } from 'react'
import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

let browser: ReturnType<typeof installBrowserMocks>

function rect(
  left = 12,
  top = 24,
  width = 160,
  height = 90,
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

function setRect(element: Element, value = rect()): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(value)
}

function TestShell({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <RouteveilProvider>
        <RouteveilView>{children}</RouteveilView>
      </RouteveilProvider>
    </MemoryRouter>
  )
}

const ForwardedCard = forwardRef<HTMLDivElement, { label: string }>(
  function ForwardedCard({ label }, ref) {
    return <div data-testid="forwarded-card" ref={ref}>{label}</div>
  },
)

function PlainCard({ label }: { label: string }) {
  return <article data-testid="plain-card">{label}</article>
}

function React19Card({
  label,
  ref,
}: {
  label: string
  ref?: Ref<HTMLDivElement>
}) {
  return <div data-testid="react-19-card" ref={ref}>{label}</div>
}

function RenamableSharedElement() {
  const [name, setName] = useState('component-old-name')

  return (
    <>
      <button onClick={() => setName('component-new-name')} type="button">
        Rename shared element
      </button>
      <RouteveilLink to="/target" transition="fade">
        <RouteveilSharedElement name={name}>
          <span data-testid="renamable-shared">Renamable</span>
        </RouteveilSharedElement>
      </RouteveilLink>
    </>
  )
}

function RemovableSharedElement() {
  const [visible, setVisible] = useState(true)

  return (
    <>
      <button onClick={() => setVisible(false)} type="button">
        Remove shared element
      </button>
      <RouteveilLink to="/target" transition="fade">
        {visible
          ? (
              <RouteveilSharedElement name="component-removable">
                <span data-testid="removable-shared">Removable</span>
              </RouteveilSharedElement>
            )
          : <span>Removed</span>}
      </RouteveilLink>
    </>
  )
}

describe('RouteveilSharedElement component', () => {
  beforeEach(() => {
    browser = installBrowserMocks()
  })

  afterEach(() => {
    browser.restore()
  })

  it('renders an intrinsic child directly and preserves its props and object ref', () => {
    const ref = createRef<HTMLButtonElement>()
    const onClick = vi.fn()
    const rendered = render(
      <TestShell>
        <RouteveilSharedElement name="component-button">
          <button
            aria-label="Open project"
            className="project-button"
            data-project-id="routeveil"
            id="project-button"
            onClick={onClick}
            ref={ref}
            style={{ color: 'rgb(1, 2, 3)' }}
            type="button"
          >
            Open
          </button>
        </RouteveilSharedElement>
      </TestShell>,
    )

    const button = screen.getByRole('button', { name: 'Open project' })
    const view = document.querySelector('[data-routeveil-view]')

    expect(button.parentElement).toBe(view)
    expect(view?.children).toHaveLength(1)
    expect(button).toHaveClass('project-button')
    expect(button).toHaveAttribute('data-project-id', 'routeveil')
    expect(button).toHaveAttribute('id', 'project-button')
    expect(button).toHaveStyle({ color: 'rgb(1, 2, 3)' })
    expect(ref.current).toBe(button)

    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)

    rendered.unmount()
    expect(ref.current).toBeNull()
  })

  it('merges a callback ref and detaches it on unmount', () => {
    const callbackRef = vi.fn<(element: HTMLDivElement | null) => void>()
    const rendered = render(
      <TestShell>
        <RouteveilSharedElement name="component-callback-ref">
          <div data-testid="callback-child" ref={callbackRef}>Callback</div>
        </RouteveilSharedElement>
      </TestShell>,
    )

    const child = screen.getByTestId('callback-child')
    expect(callbackRef).toHaveBeenLastCalledWith(child)

    rendered.unmount()
    expect(callbackRef).toHaveBeenLastCalledWith(null)
  })

  it('runs a React 19 callback ref cleanup without a null callback', () => {
    const cleanup = vi.fn()
    const callbackRef = vi.fn((element: HTMLDivElement | null) => {
      if (element) {
        return cleanup
      }
    })
    const rendered = render(
      <TestShell>
        <RouteveilSharedElement name="component-callback-cleanup">
          <div data-testid="callback-cleanup-child" ref={callbackRef}>
            Callback cleanup
          </div>
        </RouteveilSharedElement>
      </TestShell>,
    )

    const child = screen.getByTestId('callback-cleanup-child')
    expect(callbackRef).toHaveBeenCalledTimes(1)
    expect(callbackRef).toHaveBeenCalledWith(child)
    expect(cleanup).not.toHaveBeenCalled()

    rendered.unmount()
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(callbackRef).toHaveBeenCalledTimes(1)
  })

  it('updates its registered name without leaving a stale Strict Mode entry', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const rendered = render(
      <StrictMode>
        <TestShell>
          <RenamableSharedElement />
        </TestShell>
      </StrictMode>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Rename shared element' }))
    const shared = screen.getByTestId('renamable-shared')
    setRect(shared)
    fireEvent.click(screen.getByRole('link'))

    const entries = document.querySelectorAll('[data-routeveil-shared-element]')
    expect(entries).toHaveLength(1)
    expect(entries[0]).toHaveAttribute(
      'data-routeveil-shared-element',
      'component-new-name',
    )
    expect(document.querySelector(
      '[data-routeveil-shared-element="component-old-name"]',
    )).toBeNull()
    expect(warn.mock.calls.flat().join(' ')).not.toContain(
      'Multiple outgoing shared elements',
    )

    rendered.unmount()
    expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
  })

  it('unregisters only its own entry when removed under Strict Mode', () => {
    render(
      <StrictMode>
        <TestShell>
          <RemovableSharedElement />
        </TestShell>
      </StrictMode>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remove shared element' }))
    expect(screen.queryByTestId('removable-shared')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('link'))

    expect(document.querySelector('[data-routeveil-shared-portal]')).toBeNull()
    expect(browser.animations).toHaveLength(1)
  })

  it('supports a custom child that forwards its ref to one DOM element', () => {
    const ref = createRef<HTMLDivElement>()

    render(
      <TestShell>
        <RouteveilSharedElement name="component-forwarded-card">
          <ForwardedCard label="Forwarded project" ref={ref} />
        </RouteveilSharedElement>
      </TestShell>,
    )

    const card = screen.getByTestId('forwarded-card')
    expect(ref.current).toBe(card)
    expect(card.parentElement).toBe(
      document.querySelector('[data-routeveil-view]'),
    )
  })

  it('supports a React 19 function component with a normal ref prop', () => {
    const ref = createRef<HTMLDivElement>()

    render(
      <TestShell>
        <RouteveilSharedElement name="component-react-19-card">
          <React19Card label="React 19 project" ref={ref} />
        </RouteveilSharedElement>
      </TestShell>,
    )

    const card = screen.getByTestId('react-19-card')
    expect(ref.current).toBe(card)
    expect(card).toHaveTextContent('React 19 project')
    expect(card.parentElement).toBe(
      document.querySelector('[data-routeveil-view]'),
    )
  })

  it('renders an invalid-name child unchanged and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const ref = createRef<HTMLSpanElement>()

    render(
      <TestShell>
        <RouteveilSharedElement name="   ">
          <span data-testid="invalid-name-child" ref={ref}>Unchanged</span>
        </RouteveilSharedElement>
      </TestShell>,
    )

    const child = screen.getByTestId('invalid-name-child')
    expect(ref.current).toBe(child)
    expect(child.parentElement).toBe(
      document.querySelector('[data-routeveil-view]'),
    )
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain('requires a non-empty name')
  })

  it('renders a non-ref custom child unchanged and issues an actionable warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    render(
      <TestShell>
        <RouteveilSharedElement name="component-plain-card">
          <PlainCard label="Plain project" />
        </RouteveilSharedElement>
      </TestShell>,
    )

    const card = screen.getByTestId('plain-card')
    expect(card).toHaveTextContent('Plain project')
    expect(card.parentElement).toBe(
      document.querySelector('[data-routeveil-view]'),
    )
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain(
      'did not resolve its child ref to a DOM element',
    )
  })
})
