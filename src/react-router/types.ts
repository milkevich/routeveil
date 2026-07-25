import type { CSSProperties, ReactElement, ReactNode } from 'react'
import type {
  LinkProps,
  NavigateOptions,
  To,
} from 'react-router-dom'
import type {
  BuiltInTransitionName,
  ClickPosition,
  ClockOverlayOptions,
  ColumnsOverlayOptions,
  CurtainOverlayOptions,
  DissolveOverlayOptions,
  DirectionalTransitionOptions,
  HaloOverlayOptions,
  IrisOverlayOptions,
  MosaicOverlayOptions,
  PixelOverlayOptions,
  RotateTransitionOptions,
  RowsOverlayOptions,
  TunnelOverlayOptions,
  TransitionDefinition,
  VenetianOverlayOptions,
  WipeOverlayOptions,
} from '../core/index.js'

export type TransitionName =
  | BuiltInTransitionName
  | (string & Record<never, never>)

export type TransitionOptionsFor<
  TTransition extends TransitionName,
> = TTransition extends 'rotate'
  ? RotateTransitionOptions
  : TTransition extends 'slide' | 'spin'
    ? DirectionalTransitionOptions
    : TTransition extends 'pixel'
      ? PixelOverlayOptions
      : TTransition extends 'curtain'
        ? CurtainOverlayOptions
        : TTransition extends 'wipe'
          ? WipeOverlayOptions
          : TTransition extends 'columns'
            ? ColumnsOverlayOptions
            : TTransition extends 'rows'
              ? RowsOverlayOptions
              : TTransition extends 'iris'
                ? IrisOverlayOptions
                : TTransition extends 'halo'
                  ? HaloOverlayOptions
                  : TTransition extends 'tunnel'
                    ? TunnelOverlayOptions
                    : TTransition extends 'clock'
                      ? ClockOverlayOptions
                      : TTransition extends 'venetian'
                        ? VenetianOverlayOptions
                        : TTransition extends 'mosaic'
                          ? MosaicOverlayOptions
                          : TTransition extends 'dissolve'
                            ? DissolveOverlayOptions
                            : unknown

export type RouteveilPreload = false | 'intent' | 'viewport' | 'render'

export type RouteveilPendingWorkRegistrar = (
  work: PromiseLike<unknown>,
) => () => void

export type RouteveilPhase =
  | 'idle'
  | 'exiting'
  | 'covering'
  | 'navigating'
  | 'entering'
  | 'revealing'

export type RouteveilProviderProps = {
  children: ReactNode
  transitions?: Record<string, TransitionDefinition>
  preload?: RouteveilPreload
}

export type RouteveilViewProps = {
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

export type RouteveilSharedElementProps = {
  name: string
  children: ReactElement
}

export type SharedElementsOption =
  | 'all'
  | 'auto'
  | false
  | string
  | readonly string[]

export type RouteveilLinkProps<
  TTransition extends TransitionName = TransitionName,
> = LinkProps & {
  transition?: TTransition
  transitionOptions?: TransitionOptionsFor<NoInfer<TTransition>>
  smoothScrollToTop?: boolean
  scrollToSharedElement?: string
  sharedElements?: SharedElementsOption
  preload?: RouteveilPreload
}

export type RouteveilNavigateOptions<
  TTransition extends TransitionName = TransitionName,
> = NavigateOptions & {
  transition?: TTransition
  transitionOptions?: TransitionOptionsFor<NoInfer<TTransition>>
  smoothScrollToTop?: boolean
  scrollToSharedElement?: string
  sharedElements?: SharedElementsOption
}

export type RouteveilNavigate = <
  TTransition extends TransitionName = TransitionName,
>(
  to: To,
  options?: RouteveilNavigateOptions<TTransition>,
) => Promise<void>

export type RouteveilPlayOptions = {
  transitionOptions?: unknown
  clickPosition?: ClickPosition
}

export type RouteveilPlay = (
  transition: TransitionName,
  options?: RouteveilPlayOptions,
) => Promise<void>
