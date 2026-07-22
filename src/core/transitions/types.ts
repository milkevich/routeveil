import type { ComponentType, ElementType, Ref } from "react";

export type BuiltInPageTransitionName =
  | "fade"
  | "blur"
  | "slide"
  | "spin"
  | "rotate"
  | "bounce"
  | "push"
  | "pull";

export type BuiltInOverlayTransitionName =
  | "pixel"
  | "curtain"
  | "wipe"
  | "columns"
  | "rows"
  | "iris"
  | "halo"
  | "tunnel"
  | "clock"
  | "venetian"
  | "mosaic"
  | "dissolve";

export type BuiltInTransitionName =
  | BuiltInPageTransitionName
  | BuiltInOverlayTransitionName;

export type TransitionName =
  | BuiltInTransitionName
  | (string & Record<never, never>);

export type AnimationPhaseDefinition = Readonly<{
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
}>;

export type TransitionDirection = "up" | "down" | "left" | "right";

export type DirectionalTransitionOptions = Readonly<{
  direction?: TransitionDirection;
}>;

export type SlideTransitionOptions = DirectionalTransitionOptions;

export type SpinTransitionOptions = DirectionalTransitionOptions;

export type RotateDirection = "left" | "right";

export type RotateTransitionOptions = Readonly<{
  direction?: RotateDirection;
}>;

export type PageTransitionPhases = Readonly<{
  exit: AnimationPhaseDefinition;
  enter: AnimationPhaseDefinition;
}>;

export type PageTransitionResolver = (
  transitionOptions?: unknown,
) => PageTransitionPhases;

export type PageTransitionDefinition = Readonly<{
  type: "page";
  exit: AnimationPhaseDefinition;
  enter: AnimationPhaseDefinition;
  resolve?: PageTransitionResolver;
}>;

export type ClickPosition = Readonly<{
  x: number;
  y: number;
}>;

export type OverlayAnimationHandle = Readonly<{
  cover: () => Promise<void>;
  reveal: () => Promise<void>;
  reset: () => void;
}>;

export type OverlayRendererProps<TOptions = unknown> = Readonly<{
  options?: TOptions;
  clickPosition?: ClickPosition;
  controllerRef: Ref<OverlayAnimationHandle>;
}>;

export type OverlayRenderer<TOptions = never> = [TOptions] extends [never]
  ? Exclude<ElementType, string>
  : ComponentType<OverlayRendererProps<TOptions>>;

export type OverlayTransitionDefinition<TOptions = never> = Readonly<{
  type: "overlay";
  renderer: OverlayRenderer<TOptions>;
}>;

export type TransitionDefinition<TOptions = never> =
  | PageTransitionDefinition
  | OverlayTransitionDefinition<TOptions>;
