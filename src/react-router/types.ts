import type { CSSProperties, ReactNode } from 'react'
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
}

export type RouteveilViewProps = {
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

export type RouteveilLinkProps<
  TTransition extends TransitionName = TransitionName,
> = LinkProps & {
  transition?: TTransition
  transitionOptions?: TransitionOptionsFor<NoInfer<TTransition>>
  smoothScrollToTop?: boolean
}

export type RouteveilNavigateOptions<
  TTransition extends TransitionName = TransitionName,
> = NavigateOptions & {
  transition?: TTransition
  transitionOptions?: TransitionOptionsFor<NoInfer<TTransition>>
  smoothScrollToTop?: boolean
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
