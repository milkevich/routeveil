import { Component } from 'react'
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
  PageTransitionDefinition,
  PageTransitionPhases,
  PageTransitionResolver,
  PixelOrigin,
  PixelOverlayOptions,
  RadialOrigin,
  RouteveilLinkProps,
  RouteveilNavigate,
  RouteveilNavigateOptions,
  RouteveilPlay,
  RouteveilPlayOptions,
  RouteveilPhase,
  RouteveilProviderProps,
  RouteveilViewProps,
  RotateDirection,
  RotateTransitionOptions,
  RowDirection,
  RowsOverlayOptions,
  SlideTransitionOptions,
  SpinTransitionOptions,
  TunnelOverlayOptions,
  TransitionDefinition,
  TransitionDirection,
  TransitionName,
  TransitionOptionsFor,
  VenetianDirection,
  VenetianOverlayOptions,
  WipeDirection,
  WipeOverlayOptions,
} from 'routeveil/react-router'
import {
  RouteveilLink,
  RouteveilProvider,
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
  RouteveilLink,
  RouteveilProvider,
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
  radialOrigin: RadialOrigin
  routeveilPhase: RouteveilPhase
  rowDirection: RowDirection
  rowsOptions: RowsOverlayOptions
  transition: TransitionDefinition
  transitionName: TransitionName
  transitionOptions: TransitionOptionsFor<'pixel'>
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
      NonNullable<RouteveilLinkProps<'rotate'>['transitionOptions']>['direction']
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

export const rotateLeft = {
  direction: 'left',
} satisfies RotateTransitionOptions

export const rotateLink = RouteveilLink({
  to: '/',
  transition: 'rotate',
  transitionOptions: { direction: 'right' },
})

export const smoothScrollLink = RouteveilLink({
  to: '/',
  smoothScrollToTop: true,
  transition: 'fade',
})

export const instantScrollLinkProps = {
  to: '/',
  smoothScrollToTop: false,
  transition: 'fade',
} satisfies RouteveilLinkProps<'fade'>

export const smoothScrollNavigateOptions = {
  smoothScrollToTop: true,
  transition: 'fade',
} satisfies RouteveilNavigateOptions<'fade'>

export const customTransitionLink = RouteveilLink({
  to: '/',
  transition: 'brand-turn',
  transitionOptions: { direction: 'diagonal', intensity: 0.75 },
})

export const irisLink = RouteveilLink({
  to: '/',
  transition: 'iris',
  transitionOptions: { color: '#111111', origin: 'cursor' },
})

export const haloLink = RouteveilLink({
  to: '/',
  transition: 'halo',
  transitionOptions: { color: '#111111', origin: 'center' },
})

export const tunnelLink = RouteveilLink({
  to: '/',
  transition: 'tunnel',
  transitionOptions: {
    color: '#101010',
    origin: 'cursor',
    duration: 720,
    coverDuration: 420,
    revealDuration: 560,
    easing: 'ease-in-out',
  },
})

export const tunnelNavigateOptions = {
  transition: 'tunnel',
  transitionOptions: {
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
  transition: 'clock',
  transitionOptions: {
    color: '#101010',
    duration: 700,
    easing: 'linear',
    direction: 'counterclockwise',
    origin: 'cursor',
    startAngle: -45,
  },
})

export const clockNavigateOptions = {
  transition: 'clock',
  transitionOptions: {
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
  transition: 'venetian',
  transitionOptions: { alternate: true, direction: 'vertical' },
})

export function checkRotateNavigate(navigate: RouteveilNavigate): void {
  void navigate('/', {
    transition: 'rotate',
    transitionOptions: { direction: 'left' },
  })

  void navigate('/', {
    preventScrollReset: true,
    smoothScrollToTop: true,
    transition: 'fade',
  })
}
