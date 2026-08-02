import { Loader } from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'
import { useRouteveilTransition } from '../../../../react-router'
import type {
  RouteveilPlay,
  RouteveilTransition,
} from '../../../../react-router'
import type {
  RouteveilTransitionConstraint,
} from '../../../../react-router/types'
import { Arrow, PixelHeadingWord } from '../../../shared/UI'
import { Footer } from '../../../shared/UI/Footer'
import '../lab.css'
import './between-demo.css'

const BETWEEN_DURATION = 1800
const dogWalking = '/between-render-assets/dog-walking.gif'
const graffiti = '/between-render-assets/graffiti.png'
const horseRunning = '/between-render-assets/horse-running.gif'
const loadingIcons = '/between-render-assets/icons-loading.gif'
const kiss = '/between-render-assets/kiss.gif'
const leopardRunning = '/between-render-assets/leopard-running.gif'
const windowsLoader = '/between-render-assets/loader.gif'
const rotatingMonster = '/between-render-assets/monster-rotate.gif'
const routeveilPixel = '/between-render-assets/routeveil-pixel.svg'
const wave = '/between-render-assets/wave.gif'

type DemoCardProps = {
  description: string
  index: string
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
  title: string
}

type BetweenContentFrameProps = {
  children: ReactNode
  className: string
}

type BetweenDemoExample = {
  description: string
  play: (
    playTransition: RouteveilPlay,
    event: MouseEvent<HTMLButtonElement>,
  ) => Promise<void>
  title: string
}

type BetweenDemoExampleDefinition<
  TTransition extends RouteveilTransition,
> = {
  content: ReactNode
  description: string
  minDuration: number
  title: string
  transition: RouteveilTransitionConstraint<TTransition>
  usesClickPosition?: boolean
}

function DemoCard({
  description,
  index,
  onClick,
  title,
}: DemoCardProps) {
  return (
    <button
      type="button"
      className="transition-card customization-card between-demo__card"
      onClick={onClick}
    >
      <span className="transition-card__index">{index}</span>

      <span aria-hidden="true" className="transition-card__arrow">
        <Arrow diagonal />
      </span>

      <span className="transition-card__content">
        <strong>{title}</strong>

        <span className="transition-card__description">
          {description}
        </span>
      </span>
    </button>
  )
}

function BetweenContentFrame({
  children,
  className,
}: BetweenContentFrameProps) {
  return (
    <div className="between-demo__stage">
      <div className={className}>{children}</div>
    </div>
  )
}

function PreparingBetweenContent() {
  return (
    <BetweenContentFrame className="between-demo__preparing">
      <Loader
        aria-hidden="true"
        className="between-demo__spinner"
        size={16}
      />
      <span>Preparing...</span>
    </BetweenContentFrame>
  )
}

function LeopardRunBetweenContent() {
  return (
    <BetweenContentFrame className="between-demo__leopard-run">
      <img
        src={leopardRunning}
        alt=""
        aria-hidden="true"
        className="between-demo__leopard-run-image"
        draggable={false}
      />
    </BetweenContentFrame>
  )
}

function CounterBetweenContent() {
  return (
    <BetweenContentFrame className="between-demo__counter">
      <h1 aria-hidden="true" className="between-demo__counter-value">
        #04
      </h1>
    </BetweenContentFrame>
  )
}

function WindowsLoaderBetweenContent() {
  return (
    <BetweenContentFrame className="between-demo__windows-loader">
      <img
        src={windowsLoader}
        alt=""
        aria-hidden="true"
        className="between-demo__windows-loader-image"
        draggable={false}
      />
    </BetweenContentFrame>
  )
}

function LoadingIconsBetweenContent() {
  return (
    <BetweenContentFrame className="between-demo__loading-icons">
      <img
        src={loadingIcons}
        alt=""
        aria-hidden="true"
        className="between-demo__loading-icons-image"
        draggable={false}
      />
    </BetweenContentFrame>
  )
}

function GraffitiBetweenContent() {
  return (
    <BetweenContentFrame className="between-demo__graffiti">
      <img
        src={graffiti}
        alt=""
        aria-hidden="true"
        className="between-demo__graffiti-image"
        draggable={false}
      />
    </BetweenContentFrame>
  )
}

function KissBetweenContent() {
  return (
    <BetweenContentFrame className="between-demo__kiss">
      <img
        src={kiss}
        alt=""
        aria-hidden="true"
        className="between-demo__kiss-image"
        draggable={false}
      />
    </BetweenContentFrame>
  )
}

function WalkingDogBetweenContent() {
  return (
    <BetweenContentFrame className="between-demo__walking-dog">
      <img
        src={dogWalking}
        alt=""
        aria-hidden="true"
        className="between-demo__walking-dog-image"
        draggable={false}
      />
    </BetweenContentFrame>
  )
}

function MonsterBetweenContent() {
  return (
    <BetweenContentFrame className="between-demo__monster">
      <img
        src={rotatingMonster}
        alt=""
        aria-hidden="true"
        className="between-demo__monster-image"
        draggable={false}
      />
    </BetweenContentFrame>
  )
}

function WaveBetweenContent() {
  return (
    <BetweenContentFrame className="between-demo__wave">
      <img
        src={wave}
        alt=""
        aria-hidden="true"
        className="between-demo__wave-image"
        draggable={false}
      />
    </BetweenContentFrame>
  )
}

function HorseRunBetweenContent() {
  return (
    <BetweenContentFrame className="between-demo__horse-run">
      <img
        src={horseRunning}
        alt=""
        aria-hidden="true"
        className="between-demo__horse-run-image"
        draggable={false}
      />
    </BetweenContentFrame>
  )
}

function RouteveilPixelBetweenContent() {
  return (
    <BetweenContentFrame className="between-demo__routeveil-pixel">
      <img
        src={routeveilPixel}
        alt=""
        aria-hidden="true"
        className="between-demo__routeveil-pixel-image"
        draggable={false}
      />
    </BetweenContentFrame>
  )
}

function getClickPosition(event: MouseEvent<HTMLButtonElement>) {
  return {
    x: event.clientX,
    y: event.clientY,
  }
}

function defineBetweenDemoExample<
  const TTransition extends RouteveilTransition,
>({
  content,
  description,
  minDuration,
  title,
  transition,
  usesClickPosition = false,
}: BetweenDemoExampleDefinition<TTransition>): BetweenDemoExample {
  return {
    description,
    play: (playTransition, event) => {
      const options = {
        between: {
          content,
          minDuration,
        },
      }

      return usesClickPosition
        ? playTransition(transition, {
            ...options,
            clickPosition: getClickPosition(event),
          })
        : playTransition(transition, options)
    },
    title,
  }
}

const betweenDemoExamples = [
  defineBetweenDemoExample({
    title: 'push',
    description: 'A compact Preparing indicator during the page push.',
    transition: 'push',
    content: <PreparingBetweenContent />,
    minDuration: BETWEEN_DURATION,
  }),
  defineBetweenDemoExample({
    title: 'wipe',
    description: 'A running leopard centered between the wipe cover and reveal.',
    transition: {
      name: 'wipe',
      color: '#000000',
    },
    content: <LeopardRunBetweenContent />,
    minDuration: BETWEEN_DURATION,
    usesClickPosition: true,
  }),
  defineBetweenDemoExample({
    title: 'rows',
    description: 'A large #04 counter staged over the pink row transition.',
    transition: {
      name: 'rows',
      color: '#ff258b',
      order: 'reverse',
      direction: 'left',
      count: 6,
    },
    content: <CounterBetweenContent />,
    minDuration: BETWEEN_DURATION * 0.5,
    usesClickPosition: true,
  }),
  defineBetweenDemoExample({
    title: 'dissolve',
    description: 'A Windows-style loader held inside the blue dissolve.',
    transition: {
      name: 'dissolve',
      color: '#000dff',
    },
    content: <WindowsLoaderBetweenContent />,
    minDuration: BETWEEN_DURATION * 1.5,
    usesClickPosition: true,
  }),
  defineBetweenDemoExample({
    title: 'bounce',
    description: 'Animated loading icons between the bounce exit and enter.',
    transition: 'bounce',
    content: <LoadingIconsBetweenContent />,
    minDuration: BETWEEN_DURATION,
  }),
  defineBetweenDemoExample({
    title: 'venetian',
    description: 'High-contrast graffiti displayed behind the venetian blinds.',
    transition: {
      name: 'venetian',
      color: '#647375',
    },
    content: <GraffitiBetweenContent />,
    minDuration: BETWEEN_DURATION * 0.5,
    usesClickPosition: true,
  }),
  defineBetweenDemoExample({
    title: 'halo',
    description: 'A centered kiss animation inside the expanding black halo.',
    transition: {
      name: 'halo',
      color: '#000000',
      origin: 'center',
    },
    content: <KissBetweenContent />,
    minDuration: BETWEEN_DURATION * 0.8,
    usesClickPosition: true,
  }),
  defineBetweenDemoExample({
    title: 'spin',
    description: 'A walking dog crosses the viewport during the page spin.',
    transition: 'spin',
    content: <WalkingDogBetweenContent />,
    minDuration: BETWEEN_DURATION * 2.1,
  }),
  defineBetweenDemoExample({
    title: 'columns',
    description: 'A rotating monster framed by six upward yellow columns.',
    transition: {
      name: 'columns',
      color: '#F8F800',
      direction: 'up',
      count: 6,
    },
    content: <MonsterBetweenContent />,
    minDuration: BETWEEN_DURATION,
    usesClickPosition: true,
  }),
  defineBetweenDemoExample({
    title: 'curtain',
    description: 'A color-treated wave rises behind the light curtain.',
    transition: {
      name: 'curtain',
      color: '#f5f5f5',
    },
    content: <WaveBetweenContent />,
    minDuration: BETWEEN_DURATION,
    usesClickPosition: true,
  }),
  defineBetweenDemoExample({
    title: 'tunnel',
    description: 'A running horse stays centered through the warm tunnel.',
    transition: {
      name: 'tunnel',
      color: '#F5EFE4',
    },
    content: <HorseRunBetweenContent />,
    minDuration: BETWEEN_DURATION * 1.25,
  }),
  defineBetweenDemoExample({
    title: 'mosaic',
    description: 'The Routeveil pixel logo appears between the lime mosaic phases.',
    transition: {
      name: 'mosaic',
      colors: ['#d0ff00', '#eeffa3', '#c0eb00'],
    },
    content: <RouteveilPixelBetweenContent />,
    minDuration: BETWEEN_DURATION * 0.5,
  }),
] as const

export function BetweenDemoPage() {
  const playTransition = useRouteveilTransition()

  return (
    <>
      <main className="page lab-page">
        <header className="lab-hero page-frame">
          <div className="lab-hero__heading-mask">
            <div className="lab-hero__heading-reveal">
              <PixelHeadingWord
                as="h1"
                initialFont="square"
                hoverFont="square"
              >
                Between Render
              </PixelHeadingWord>
            </div>
          </div>

          <div className="lab-hero__description-mask">
            <div className="lab-hero__description-reveal">
              <p className="lab-hero__description">
                Display custom content between transition phases without
                leaving the current page.
              </p>
            </div>
          </div>
        </header>

        <div className="lab-workbench page-frame">
          <section className="lab-group">
            <header className="lab-group__header">
              <div className="lab-group__title">
                <span>01</span>

                <PixelHeadingWord
                  as="h2"
                  initialFont="square"
                  hoverFont="square"
                >
                  Examples
                </PixelHeadingWord>
              </div>

              <p>
                Each example controls its own size, alignment, and internal
                layout while Routeveil manages the transition lifecycle.
              </p>
            </header>

            <div className="lab-card-grid">
              {betweenDemoExamples.map((example, index) => (
                <DemoCard
                  key={example.title}
                  description={example.description}
                  index={String(index + 1).padStart(2, '0')}
                  title={example.title}
                  onClick={(event) => {
                    void example.play(playTransition, event)
                  }}
                />
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  )
}
