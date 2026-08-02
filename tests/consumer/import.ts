import { Component, createElement } from 'react'
import type { ReactPortal } from 'react'
import type {
  AnimationPhaseDefinition,
  BuiltInOverlayTransitionName,
  BuiltInPageTransitionName,
  BuiltInTransitionName,
  ClickPosition,
  ClockDirection,
  ClockOverlayOptions,
  ColumnDirection,
  ColumnsOverlayOptions,
  CurtainAxis,
  CurtainOverlayOptions,
  DissolveOverlayOptions,
  DirectionalTransitionOptions,
  HaloOverlayOptions,
  IrisOverlayOptions,
  MosaicOrigin,
  MosaicOverlayOptions,
  OverlayAnimationHandle,
  OverlayRenderer,
  OverlayRendererProps,
  OverlayTransitionDefinition,
  PageTransitionInput,
  PageTransitionDefinition,
  PageTransitionPhases,
  PageTransitionResolver,
  PixelOrigin,
  PixelOverlayOptions,
  RadialOrigin,
  RouteveilBetweenInput,
  RouteveilBetweenProps,
  RouteveilLinkProps,
  RouteveilNavigate,
  RouteveilNavigateOptions,
  RouteveilPlay,
  RouteveilPlayOptions,
  RouteveilPhase,
  RouteveilProviderProps,
  RouteveilTransition,
  RouteveilSharedElementProps,
  RouteveilViewProps,
  SharedElementsOption,
  RotateDirection,
  RotateTransitionOptions,
  RowDirection,
  RowsOverlayOptions,
  SlideTransitionOptions,
  SpinTransitionOptions,
  SplitTransition,
  TunnelOverlayOptions,
  TransitionDefinition,
  TransitionDirection,
  TransitionConfig,
  TransitionName,
  TransitionOptionsFor,
  VenetianDirection,
  VenetianOverlayOptions,
  WipeDirection,
  WipeOverlayOptions,
} from 'routeveil/react-router'
import {
  RouteveilBetween,
  RouteveilLink,
  RouteveilProvider,
  RouteveilSharedElement,
  RouteveilView,
  useRouteveilNavigate,
  useRouteveilTransition,
} from 'routeveil/react-router'

type Equal<TLeft, TRight> =
  (<TValue>() => TValue extends TLeft ? 1 : 2) extends
  (<TValue>() => TValue extends TRight ? 1 : 2)
    ? true
    : false

type Expect<TValue extends true> = TValue

export const routeveilApi = {
  RouteveilBetween,
  RouteveilLink,
  RouteveilProvider,
  RouteveilSharedElement,
  RouteveilView,
  useRouteveilNavigate,
  useRouteveilTransition,
}

type ClassOverlayOptions = Readonly<{
  intensity?: number
}>

class ClassOverlay extends Component<OverlayRendererProps<ClassOverlayOptions>> {
  render() {
    return null
  }
}

export const classOverlayTransition = {
  type: 'overlay',
  renderer: ClassOverlay,
} satisfies TransitionDefinition<ClassOverlayOptions>

export const classOverlayRegistry = {
  'class-overlay': classOverlayTransition,
} satisfies NonNullable<RouteveilProviderProps['transitions']>

export type ConsumerLinkProps = RouteveilLinkProps
export type ConsumerBetweenInput = RouteveilBetweenInput
export type ConsumerBetweenProps = RouteveilBetweenProps
export type ConsumerRotateDirection = RotateDirection
export type ConsumerRotateOptions = RotateTransitionOptions
export type ConsumerRotateLinkProps = RouteveilLinkProps<'rotate'>
export type ConsumerRotateNavigateOptions = RouteveilNavigateOptions<'rotate'>
export type ConsumerDirection = TransitionDirection
export type ConsumerSlideOptions = SlideTransitionOptions
export type ConsumerSpinOptions = SpinTransitionOptions
export type ConsumerIrisOptions = IrisOverlayOptions
export type ConsumerHaloOptions = HaloOverlayOptions
export type ConsumerVenetianOptions = VenetianOverlayOptions
export type ConsumerMosaicOptions = MosaicOverlayOptions
export type ConsumerDissolveOptions = DissolveOverlayOptions
export type ConsumerTunnelOptions = TunnelOverlayOptions
export type ConsumerClockOptions = ClockOverlayOptions
export type ConsumerPlay = RouteveilPlay
export type ConsumerPublicTypes = {
  animationPhase: AnimationPhaseDefinition
  builtInOverlayName: BuiltInOverlayTransitionName
  builtInPageName: BuiltInPageTransitionName
  builtInName: BuiltInTransitionName
  clickPosition: ClickPosition
  clockDirection: ClockDirection
  columnDirection: ColumnDirection
  columnsOptions: ColumnsOverlayOptions
  curtainAxis: CurtainAxis
  curtainOptions: CurtainOverlayOptions
  directionalOptions: DirectionalTransitionOptions
  mosaicOrigin: MosaicOrigin
  overlayHandle: OverlayAnimationHandle
  overlayRenderer: OverlayRenderer
  overlayProps: OverlayRendererProps
  overlayTransition: OverlayTransitionDefinition
  pageTransition: PageTransitionDefinition
  pageTransitionPhases: PageTransitionPhases
  pageTransitionResolver: PageTransitionResolver
  pixelOrigin: PixelOrigin
  pixelOptions: PixelOverlayOptions
  playOptions: RouteveilPlayOptions
  providerProps: RouteveilProviderProps
  betweenInput: RouteveilBetweenInput
  betweenProps: RouteveilBetweenProps
  sharedElementProps: RouteveilSharedElementProps
  sharedElementsOption: SharedElementsOption
  radialOrigin: RadialOrigin
  routeveilPhase: RouteveilPhase
  rowDirection: RowDirection
  rowsOptions: RowsOverlayOptions
  transition: TransitionDefinition
  transitionName: TransitionName
  pageTransitionInput: PageTransitionInput<'slide'>
  routeveilTransition: RouteveilTransition<'slide'>
  resolvedTransitionOptions: TransitionOptionsFor<'pixel'>
  splitTransition: SplitTransition<'slide'>
  transitionConfig: TransitionConfig<'pixel'>
  venetianDirection: VenetianDirection
  viewProps: RouteveilViewProps
  wipeDirection: WipeDirection
  wipeOptions: WipeOverlayOptions
}
export type RotateRejectsVertical = Expect<Equal<
  Extract<NonNullable<RotateTransitionOptions['direction']>, 'up' | 'down'>,
  never
>>
export type RotateLinkRejectsVertical = Expect<Equal<
  Extract<
    NonNullable<
      Extract<
        NonNullable<RouteveilLinkProps<'rotate'>['transition']>,
        { name: 'rotate' }
      >['direction']
    >,
    'up' | 'down'
  >,
  never
>>
export type TunnelRejectsCornerOrigin = Expect<Equal<
  Extract<NonNullable<TunnelOverlayOptions['origin']>, 'top-left'>,
  never
>>
export type ClockRejectsLinearDirection = Expect<Equal<
  Extract<NonNullable<ClockOverlayOptions['direction']>, 'up'>,
  never
>>
export type ClockRejectsCornerOrigin = Expect<Equal<
  Extract<NonNullable<ClockOverlayOptions['origin']>, 'top-left'>,
  never
>>
export type HaloRejectsSeed = Expect<Equal<
  'seed' extends keyof HaloOverlayOptions ? true : false,
  false
>>
export type IrisRejectsCornerOrigin = Expect<Equal<
  Extract<NonNullable<IrisOverlayOptions['origin']>, 'top-left'>,
  never
>>

type RemovedTransitionOptionsKey = `transition${'Options'}`
type BetweenConfiguration = Extract<
  RouteveilBetweenInput,
  { content: unknown }
>
type UnsupportedBetweenConfigurationKey =
  | 'children'
  | 'element'
  | 'render'
  | 'while'

type LinkTransitionFor<
  TTransition extends RouteveilTransition,
> = NonNullable<
  Parameters<typeof RouteveilLink<TTransition>>[0]['transition']
>

export type TransitionStringIsValid = Expect<Equal<
  'fade' extends RouteveilTransition<'fade'> ? true : false,
  true
>>
export type ConfiguredPageIsValid = Expect<Equal<
  {
    name: 'slide'
    direction: 'left'
  } extends RouteveilTransition<'slide'> ? true : false,
  true
>>
export type ConfiguredOverlayIsValid = Expect<Equal<
  {
    name: 'iris'
    origin: 'cursor'
    color: '#111111'
  } extends RouteveilTransition<'iris'> ? true : false,
  true
>>
export type SplitStringsAreValid = Expect<Equal<
  {
    exit: 'fade'
    enter: 'slide'
  } extends RouteveilTransition<'fade' | 'slide'> ? true : false,
  true
>>
export type SplitConfigsAreValid = Expect<Equal<
  {
    exit: { name: 'slide'; direction: 'left' }
    enter: { name: 'slide'; direction: 'right' }
  } extends RouteveilTransition<'slide'> ? true : false,
  true
>>
export type MixedSplitIsValid = Expect<Equal<
  {
    exit: 'fade'
    enter: { name: 'slide'; direction: 'up' }
  } extends RouteveilTransition<'fade' | 'slide'> ? true : false,
  true
>>
export type ExitOnlyIsValid = Expect<Equal<
  { exit: 'fade' } extends RouteveilTransition<'fade'> ? true : false,
  true
>>
export type EnterOnlyIsValid = Expect<Equal<
  { enter: 'fade' } extends RouteveilTransition<'fade'> ? true : false,
  true
>>
export type EmptySplitIsInvalid = Expect<Equal<
  Record<never, never> extends SplitTransition<'fade'> ? true : false,
  false
>>
export type NameWithExitIsInvalid = Expect<Equal<
  {
    name: 'fade'
    exit: 'fade'
  } extends RouteveilTransition<'fade'> ? true : false,
  false
>>
export type NameWithEnterIsInvalid = Expect<Equal<
  {
    name: 'fade'
    enter: 'fade'
  } extends RouteveilTransition<'fade'> ? true : false,
  false
>>
export type OverlayExitIsInvalid = Expect<Equal<
  { exit: 'iris' } extends SplitTransition<'iris'> ? true : false,
  false
>>
export type OverlayEnterIsInvalid = Expect<Equal<
  { enter: 'iris' } extends SplitTransition<'iris'> ? true : false,
  false
>>
export type RemovedLinkOptionIsInvalid = Expect<Equal<
  Extract<keyof RouteveilLinkProps, RemovedTransitionOptionsKey>,
  never
>>
export type RemovedNavigateOptionIsInvalid = Expect<Equal<
  Extract<keyof RouteveilNavigateOptions, RemovedTransitionOptionsKey>,
  never
>>
export type RemovedPlayOptionIsInvalid = Expect<Equal<
  Extract<keyof RouteveilPlayOptions, RemovedTransitionOptionsKey>,
  never
>>
export type BetweenElementShorthandIsValid = Expect<Equal<
  ReturnType<typeof createElement> extends RouteveilBetweenInput ? true : false,
  true
>>
export type BetweenPortalShorthandIsValid = Expect<Equal<
  ReactPortal extends RouteveilBetweenInput ? true : false,
  true
>>
export type BetweenConfigurationIsValid = Expect<Equal<
  {
    content: ReturnType<typeof createElement>
    minDuration: number
  } extends RouteveilBetweenInput ? true : false,
  true
>>
export type BetweenConfigurationRequiresContent = Expect<Equal<
  { minDuration: number } extends RouteveilBetweenInput ? true : false,
  false
>>
export type BetweenConfigurationRejectsUnsupportedKeys = Expect<Equal<
  Extract<keyof BetweenConfiguration, UnsupportedBetweenConfigurationKey>,
  never
>>
export type BetweenComponentRequiresContent = Expect<Equal<
  Record<never, never> extends RouteveilBetweenProps ? true : false,
  false
>>
export type BetweenComponentWhileIsBoolean = Expect<Equal<
  NonNullable<RouteveilBetweenProps['while']>,
  boolean
>>
export type BetweenComponentMinDurationIsNumeric = Expect<Equal<
  NonNullable<RouteveilBetweenProps['minDuration']>,
  number
>>
export type BetweenComponentRejectsChildren = Expect<Equal<
  Extract<keyof RouteveilBetweenProps, 'children'>,
  never
>>
export type LinkSupportsBetween = Expect<Equal<
  NonNullable<RouteveilLinkProps['between']>,
  Exclude<RouteveilBetweenInput, null | undefined>
>>
export type NavigateSupportsBetween = Expect<Equal<
  NonNullable<RouteveilNavigateOptions['between']>,
  Exclude<RouteveilBetweenInput, null | undefined>
>>
export type PlaybackSupportsBetween = Expect<Equal<
  NonNullable<RouteveilPlayOptions['between']>,
  Exclude<RouteveilBetweenInput, null | undefined>
>>
export type ProviderRejectsBetween = Expect<Equal<
  Extract<keyof RouteveilProviderProps, 'between'>,
  never
>>
export type PublicPhaseIncludesBetween = Expect<Equal<
  Extract<RouteveilPhase, 'between'>,
  'between'
>>
export type CustomTransitionConfigIsValid = Expect<Equal<
  {
    name: 'brand-turn'
    direction: 'diagonal'
    intensity: 0.75
  } extends TransitionConfig<'brand-turn'> ? true : false,
  true
>>
export type OverlayUnionPhaseIsInvalid = Expect<Equal<
  LinkTransitionFor<{
    exit: { name: 'iris' | 'slide' }
  }>,
  never
>>
export type NameWithUndefinedExitIsInvalid = Expect<Equal<
  LinkTransitionFor<{
    name: 'fade'
    exit: undefined
  }>,
  never
>>
export type UndefinedNameWithExitIsInvalid = Expect<Equal<
  LinkTransitionFor<{
    name: undefined
    exit: 'fade'
  }>,
  never
>>
export type InvalidKnownNameUnionOptionsAreRejected = Expect<Equal<
  LinkTransitionFor<{
    name: 'rotate' | 'slide'
    direction: 'up'
  }>,
  never
>>
export type ValidKnownNameUnionOptionsAreAccepted = Expect<Equal<
  {
    name: 'rotate' | 'slide'
    direction: 'left'
  } extends LinkTransitionFor<{
    name: 'rotate' | 'slide'
    direction: 'left'
  }> ? true : false,
  true
>>

export const rotateLeft = {
  direction: 'left',
} satisfies RotateTransitionOptions

export const rotateLink = RouteveilLink({
  to: '/',
  transition: { name: 'rotate', direction: 'right' },
})

export const betweenElement = createElement(RouteveilBetween, {
  content: createElement('strong', null, 'Loading'),
})

export const betweenElementWithOptions = createElement(RouteveilBetween, {
  content: createElement('strong', null, 'Loading'),
  minDuration: 500,
  while: true,
})

export const shorthandBetweenLink = RouteveilLink({
  between: createElement('strong', null, 'Loading'),
  to: '/',
  transition: 'fade',
})

export const configuredBetweenLink = RouteveilLink({
  between: {
    content: createElement('strong', null, 'Loading'),
    minDuration: 500,
  },
  to: '/',
  transition: 'fade',
})

export const configuredBetweenNavigateOptions = {
  between: {
    content: createElement('strong', null, 'Loading'),
    minDuration: 500,
  },
  transition: 'fade',
} satisfies RouteveilNavigateOptions<'fade'>

export const smoothScrollLink = RouteveilLink({
  scrollToSharedElement: 'consumer-example',
  to: '/',
  smoothScrollToTop: true,
  transition: 'fade',
})

export const sharedElement = RouteveilSharedElement({
  name: 'consumer-example',
  children: createElement(RouteveilLink, {
    to: '/',
    transition: 'fade',
  }),
})

export const instantScrollLinkProps = {
  to: '/',
  smoothScrollToTop: false,
  transition: 'fade',
} satisfies RouteveilLinkProps<'fade'>

export const smoothScrollNavigateOptions = {
  scrollToSharedElement: 'consumer-example',
  smoothScrollToTop: true,
  transition: 'fade',
} satisfies RouteveilNavigateOptions<'fade'>

export const explicitSharedLinkProps = {
  sharedElements: ['consumer-image', 'consumer-title'] as const,
  to: '/',
  transition: 'fade',
} satisfies RouteveilLinkProps<'fade'>

export const routeWideSharedNavigateOptions = {
  sharedElements: 'all',
  transition: 'fade',
} satisfies RouteveilNavigateOptions<'fade'>

export const disabledSharedNavigateOptions = {
  sharedElements: false,
  transition: 'fade',
} satisfies RouteveilNavigateOptions<'fade'>

export const customTransitionLink = RouteveilLink({
  to: '/',
  transition: {
    name: 'brand-turn',
    direction: 'diagonal',
    intensity: 0.75,
  },
})

export const irisLink = RouteveilLink({
  to: '/',
  transition: {
    name: 'iris',
    color: '#111111',
    origin: 'cursor',
  },
})

export const haloLink = RouteveilLink({
  to: '/',
  transition: {
    name: 'halo',
    color: '#111111',
    origin: 'center',
  },
})

export const tunnelLink = RouteveilLink({
  to: '/',
  transition: {
    name: 'tunnel',
    color: '#101010',
    origin: 'cursor',
    duration: 720,
    coverDuration: 420,
    revealDuration: 560,
    easing: 'ease-in-out',
  },
})

export const tunnelNavigateOptions = {
  transition: {
    name: 'tunnel',
    color: '#202020',
    origin: 'center',
    duration: 680,
    coverDuration: 400,
    revealDuration: 500,
    easing: 'linear',
  },
} satisfies RouteveilNavigateOptions<'tunnel'>

export const clockLink = RouteveilLink({
  to: '/',
  transition: {
    name: 'clock',
    color: '#101010',
    duration: 700,
    easing: 'linear',
    direction: 'counterclockwise',
    origin: 'cursor',
    startAngle: -45,
  },
})

export const clockNavigateOptions = {
  transition: {
    name: 'clock',
    color: '#202020',
    duration: 720,
    easing: 'ease-in-out',
    direction: 'clockwise',
    origin: 'center',
    startAngle: -90,
  },
} satisfies RouteveilNavigateOptions<'clock'>

export const venetianLink = RouteveilLink({
  to: '/',
  transition: {
    name: 'venetian',
    alternate: true,
    direction: 'vertical',
  },
})

export const splitLink = RouteveilLink({
  to: '/',
  transition: { exit: 'fade', enter: 'slide' },
})

export const configuredSplitLink = RouteveilLink({
  to: '/',
  transition: {
    exit: { name: 'slide', direction: 'left' },
    enter: { name: 'slide', direction: 'right' },
  },
})

export const mixedSplitLink = RouteveilLink({
  to: '/',
  transition: {
    exit: 'fade',
    enter: { name: 'slide', direction: 'up' },
  },
})

export const exitOnlyLink = RouteveilLink({
  to: '/',
  transition: { exit: 'fade' },
})

export const enterOnlyLink = RouteveilLink({
  to: '/',
  transition: { enter: 'slide' },
})

export function checkRotateNavigate(navigate: RouteveilNavigate): void {
  void navigate('/', {
    transition: { name: 'rotate', direction: 'left' },
  })

  void navigate('/', {
    between: createElement('strong', null, 'Loading'),
    preventScrollReset: true,
    scrollToSharedElement: 'consumer-example',
    smoothScrollToTop: true,
    transition: 'fade',
  })
}

export function checkPlayback(play: RouteveilPlay): void {
  void play('fade')
  void play('fade', {
    between: {
      content: createElement('strong', null, 'Loading'),
      minDuration: 500,
    },
  })
  void play({ name: 'slide', direction: 'left' })
  void play({ exit: 'fade', enter: 'slide' })
  void play(
    { name: 'iris', color: '#111111', origin: 'cursor' },
    { clickPosition: { x: 12, y: 24 } },
  )
}
