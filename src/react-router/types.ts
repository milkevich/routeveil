import type { CSSProperties, ReactElement, ReactNode } from 'react'
import type {
  LinkProps,
  NavigateOptions,
  To,
} from 'react-router-dom'
import type {
  BuiltInOverlayTransitionName,
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

type TransitionConfigOptions<
  TTransition extends TransitionName,
> = TTransition extends BuiltInTransitionName
  ? TransitionOptionsFor<TTransition>
  : Readonly<Record<string, unknown>>

export type TransitionConfig<
  TTransition extends TransitionName = TransitionName,
> = TTransition extends TransitionName
  ? Readonly<{
      name: TTransition
      exit?: never
      enter?: never
    }> & TransitionConfigOptions<TTransition>
  : never

export type PageTransitionInput<
  TTransition extends TransitionName = TransitionName,
> = TTransition extends BuiltInOverlayTransitionName
  ? never
  : TTransition | TransitionConfig<TTransition>

export type SplitTransition<
  TTransition extends TransitionName = TransitionName,
> =
  | Readonly<{
      exit: PageTransitionInput<TTransition>
      enter?: PageTransitionInput<TTransition>
      name?: never
    }>
  | Readonly<{
      exit?: PageTransitionInput<TTransition>
      enter: PageTransitionInput<TTransition>
      name?: never
    }>

export type RouteveilTransition<
  TTransition extends TransitionName = TransitionName,
> =
  | TTransition
  | TransitionConfig<TTransition>
  | SplitTransition<TTransition>

type DefinedProperty<
  TValue,
  TKey extends PropertyKey,
> = TKey extends keyof TValue
  ? Exclude<TValue[TKey], undefined>
  : never

type PresentProperty<
  TValue,
  TKey extends PropertyKey,
> = TKey extends keyof TValue
  ? [Required<TValue>[TKey]] extends [never]
    ? never
    : TKey
  : never

type ValidTransitionConfig<TValue> =
  TValue extends { name: infer TTransition extends TransitionName }
    ? [PresentProperty<TValue, 'exit' | 'enter'>] extends [never]
      ? [InvalidBuiltInTransitionConfig<TValue, TTransition>] extends [never]
        ? TValue
        : never
      : never
    : never

type InvalidBuiltInTransitionConfig<
  TValue,
  TTransition extends TransitionName,
> = TTransition extends BuiltInTransitionName
  ? Exclude<
      keyof TValue,
      | 'name'
      | 'exit'
      | 'enter'
      | keyof TransitionOptionsFor<TTransition>
    > extends never
    ? Omit<TValue, 'name' | 'exit' | 'enter'> extends
      TransitionOptionsFor<TTransition>
      ? never
      : TTransition
    : TTransition
  : never

type ValidPageTransitionInput<TValue> =
  TValue extends TransitionName
    ? Extract<TValue, BuiltInOverlayTransitionName> extends never
      ? TValue
      : never
    : TValue extends { name: infer TTransition extends TransitionName }
      ? Extract<TTransition, BuiltInOverlayTransitionName> extends never
        ? ValidTransitionConfig<TValue>
        : never
      : never

type InvalidPageTransitionInput<TValue> =
  TValue extends unknown
    ? [ValidPageTransitionInput<TValue>] extends [never]
      ? TValue
      : never
    : never

type ValidSplitTransition<TValue extends object> =
  [PresentProperty<TValue, 'name'>] extends [never]
    ? Exclude<keyof TValue, 'name' | 'exit' | 'enter'> extends never
      ? [DefinedProperty<TValue, 'exit'>] extends [never]
        ? [DefinedProperty<TValue, 'enter'>] extends [never]
          ? never
          : [InvalidPageTransitionInput<
              DefinedProperty<TValue, 'enter'>
            >] extends [never]
            ? TValue
            : never
        : [InvalidPageTransitionInput<
            DefinedProperty<TValue, 'exit'>
          >] extends [never]
          ? [DefinedProperty<TValue, 'enter'>] extends [never]
            ? TValue
            : [InvalidPageTransitionInput<
                DefinedProperty<TValue, 'enter'>
              >] extends [never]
              ? TValue
              : never
          : never
      : never
    : never

type ValidRouteveilTransition<TValue> =
  TValue extends TransitionName
    ? TValue
    : TValue extends object
      ? [PresentProperty<TValue, 'name'>] extends [never]
        ? ValidSplitTransition<TValue>
        : [PresentProperty<TValue, 'exit' | 'enter'>] extends [never]
          ? ValidTransitionConfig<TValue>
          : never
      : never

export type RouteveilTransitionConstraint<
  TValue extends RouteveilTransition,
> = TValue & ValidRouteveilTransition<TValue>

export type RouteveilPreload = false | 'intent' | 'viewport' | 'render'

export type RouteveilPendingWorkRegistrar = (
  work: PromiseLike<unknown>,
) => () => void

export type RouteveilPhase =
  | 'idle'
  | 'exiting'
  | 'covering'
  | 'navigating'
  | 'between'
  | 'entering'
  | 'revealing'

export type RouteveilBetweenInput =
  | ReactNode
  | Readonly<{
      content: ReactNode
      minDuration?: number
    }>

export type RouteveilBetweenProps = {
  content: ReactNode
  while?: boolean
  minDuration?: number
}

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
> = Omit<LinkProps, 'to'> & {
  to: To | number
  transition?: RouteveilTransition<TTransition>
  between?: RouteveilBetweenInput
  smoothScrollToTop?: boolean
  scrollToSharedElement?: string
  sharedElements?: SharedElementsOption
  preload?: RouteveilPreload
}

export type RouteveilNavigateOptions<
  TTransition extends TransitionName = TransitionName,
> = NavigateOptions & {
  transition?: RouteveilTransition<TTransition>
  between?: RouteveilBetweenInput
  smoothScrollToTop?: boolean
  scrollToSharedElement?: string
  sharedElements?: SharedElementsOption
}

export type RouteveilNavigate = <
  const TTransition extends RouteveilTransition = RouteveilTransition,
>(
  to: To | number,
  options?: Omit<RouteveilNavigateOptions, 'transition'> & {
    transition?: RouteveilTransitionConstraint<TTransition>
  },
) => Promise<void>

export type RouteveilPlayOptions = {
  between?: RouteveilBetweenInput
  clickPosition?: ClickPosition
}

export type RouteveilPlay = <
  const TTransition extends RouteveilTransition = RouteveilTransition,
>(
  transition: RouteveilTransitionConstraint<TTransition>,
  options?: RouteveilPlayOptions,
) => Promise<void>
