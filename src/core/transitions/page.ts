import type {
  AnimationPhaseDefinition,
  PageTransitionDefinition,
  PageTransitionPhases,
  PageTransitionResolver,
  RotateDirection,
  TransitionDirection,
} from "./types.js";

const EXIT_OPTIONS: KeyframeAnimationOptions = {
  duration: 300,
  easing: "ease-in",
  fill: "forwards",
};

const ENTER_OPTIONS: KeyframeAnimationOptions = {
  duration: 420,
  easing: "ease-out",
  fill: "both",
};

const DEPTH_EXIT_OPTIONS: KeyframeAnimationOptions = {
  easing: "ease-in",
  duration: 320,
  fill: "forwards",
};

const DEPTH_ENTER_OPTIONS: KeyframeAnimationOptions = {
  ...DEPTH_EXIT_OPTIONS,
  easing: "ease-out",
  fill: "both",
};

function phase(
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): AnimationPhaseDefinition {
  return { keyframes, options: { ...options } };
}

function pageTransition(
  exit: Keyframe[],
  enter: Keyframe[],
  exitOptions: KeyframeAnimationOptions = EXIT_OPTIONS,
  enterOptions: KeyframeAnimationOptions = ENTER_OPTIONS,
): PageTransitionDefinition {
  return {
    type: "page",
    exit: phase(exit, exitOptions),
    enter: phase(enter, enterOptions),
  };
}

function optionAwarePageTransition(
  resolve: PageTransitionResolver,
): PageTransitionDefinition {
  const defaults = resolve();

  return {
    type: "page",
    ...defaults,
    resolve,
  };
}

function pageTransitionPhases(
  exit: Keyframe[],
  enter: Keyframe[],
  exitOptions: KeyframeAnimationOptions = EXIT_OPTIONS,
  enterOptions: KeyframeAnimationOptions = ENTER_OPTIONS,
): PageTransitionPhases {
  return {
    exit: phase(exit, exitOptions),
    enter: phase(enter, enterOptions),
  };
}

function resolveDirection(options?: unknown): TransitionDirection {
  if (typeof options !== "object" || options === null) {
    return "up";
  }

  const { direction } = options as { direction?: unknown };

  return direction === "up" ||
    direction === "down" ||
    direction === "left" ||
    direction === "right"
    ? direction
    : "up";
}

type DirectionalTransforms = Readonly<{
  exit: string;
  enter: string;
}>;

function slideTransforms(direction: TransitionDirection): DirectionalTransforms {
  switch (direction) {
    case "down":
      return {
        exit: "translate3d(0, 206px, 0)",
        enter: "translate3d(0, -206px, 0)",
      };
    case "left":
      return {
        exit: "translate3d(-206px, 0, 0)",
        enter: "translate3d(206px, 0, 0)",
      };
    case "right":
      return {
        exit: "translate3d(206px, 0, 0)",
        enter: "translate3d(-206px, 0, 0)",
      };
    case "up":
      return {
        exit: "translate3d(0, -206px, 0)",
        enter: "translate3d(0, 206px, 0)",
      };
  }
}

function resolveSlide(options?: unknown): PageTransitionPhases {
  const transforms = slideTransforms(resolveDirection(options));

  return pageTransitionPhases(
    [
      { opacity: 1, transform: "translate3d(0, 0, 0)" },
      { opacity: 0, transform: transforms.exit },
    ],
    [
      { opacity: 0, transform: transforms.enter },
      { opacity: 1, transform: "translate3d(0, 0, 0)" },
    ],
  );
}

type SpinTransforms = Readonly<{
  rest: string;
  exitMiddle: string;
  exitEnd: string;
  enterStart: string;
  enterMiddle: string;
}>;

function spinTransforms(direction: TransitionDirection): SpinTransforms {
  switch (direction) {
    case "down":
      return {
        rest:
          "perspective(1200px) translate3d(0, 0, 0) rotateX(0deg)",
        exitMiddle:
          "perspective(1200px) translate3d(0, 12%, 0) rotateX(-28deg)",
        exitEnd:
          "perspective(1200px) translate3d(0, 34%, 0) rotateX(-72deg)",
        enterStart:
          "perspective(1200px) translate3d(0, -34%, 0) rotateX(72deg)",
        enterMiddle:
          "perspective(1200px) translate3d(0, -12%, 0) rotateX(28deg)",
      };
    case "left":
      return {
        rest:
          "perspective(1200px) translate3d(0, 0, 0) rotateY(0deg)",
        exitMiddle:
          "perspective(1200px) translate3d(-12%, 0, 0) rotateY(-28deg)",
        exitEnd:
          "perspective(1200px) translate3d(-34%, 0, 0) rotateY(-72deg)",
        enterStart:
          "perspective(1200px) translate3d(34%, 0, 0) rotateY(72deg)",
        enterMiddle:
          "perspective(1200px) translate3d(12%, 0, 0) rotateY(28deg)",
      };
    case "right":
      return {
        rest:
          "perspective(1200px) translate3d(0, 0, 0) rotateY(0deg)",
        exitMiddle:
          "perspective(1200px) translate3d(12%, 0, 0) rotateY(28deg)",
        exitEnd:
          "perspective(1200px) translate3d(34%, 0, 0) rotateY(72deg)",
        enterStart:
          "perspective(1200px) translate3d(-34%, 0, 0) rotateY(-72deg)",
        enterMiddle:
          "perspective(1200px) translate3d(-12%, 0, 0) rotateY(-28deg)",
      };
    case "up":
      return {
        rest:
          "perspective(1200px) translate3d(0, 0, 0) rotateX(0deg)",
        exitMiddle:
          "perspective(1200px) translate3d(0, -12%, 0) rotateX(28deg)",
        exitEnd:
          "perspective(1200px) translate3d(0, -34%, 0) rotateX(72deg)",
        enterStart:
          "perspective(1200px) translate3d(0, 34%, 0) rotateX(-72deg)",
        enterMiddle:
          "perspective(1200px) translate3d(0, 12%, 0) rotateX(-28deg)",
      };
  }
}

function resolveSpin(options?: unknown): PageTransitionPhases {
  const transforms = spinTransforms(resolveDirection(options));

  return pageTransitionPhases(
    [
      { opacity: 1, transform: transforms.rest },
      { opacity: 0.68, offset: 0.56, transform: transforms.exitMiddle },
      { opacity: 0, transform: transforms.exitEnd },
    ],
    [
      { opacity: 0, transform: transforms.enterStart },
      { opacity: 0.68, offset: 0.44, transform: transforms.enterMiddle },
      { opacity: 1, transform: transforms.rest },
    ],
    {
      ...EXIT_OPTIONS,
      duration: 280,
    },
    {
      ...ENTER_OPTIONS,
      duration: 320,
    },
  );
}

function resolveRotateDirection(options?: unknown): RotateDirection {
  if (typeof options !== "object" || options === null) {
    return "right";
  }

  const { direction } = options as { direction?: unknown };

  return direction === "left" || direction === "right" ? direction : "right";
}

type RotateTransforms = Readonly<{
  exitMiddle: string;
  exitEnd: string;
  enterStart: string;
  enterMiddle: string;
}>;

function rotateTransforms(direction: RotateDirection): RotateTransforms {
  const sign = direction === "right" ? 1 : -1;

  return {
    exitMiddle: `translate3d(${String(sign * 16)}%, 0, 0) rotate(${String(sign * 7)}deg)`,
    exitEnd: `translate3d(${String(sign * 40)}%, 0, 0) rotate(${String(sign * 18)}deg)`,
    enterStart: `translate3d(${String(sign * -40)}%, 0, 0) rotate(${String(sign * -18)}deg)`,
    enterMiddle: `translate3d(${String(sign * -16)}%, 0, 0) rotate(${String(sign * -7)}deg)`,
  };
}

function resolveRotate(options?: unknown): PageTransitionPhases {
  const transforms = rotateTransforms(resolveRotateDirection(options));

  return pageTransitionPhases(
    [
      { opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg)" },
      { opacity: 0.55, offset: 0.55, transform: transforms.exitMiddle },
      { opacity: 0, transform: transforms.exitEnd },
    ],
    [
      { opacity: 0, transform: transforms.enterStart },
      { opacity: 0.55, offset: 0.45, transform: transforms.enterMiddle },
      { opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg)" },
    ],
    {
      ...EXIT_OPTIONS,
      duration: 280,
    },
    {
      ...ENTER_OPTIONS,
      duration: 440,
    },
  );
}

export const fade = pageTransition(
  [{ opacity: 1 }, { opacity: 0 }],
  [{ opacity: 0 }, { opacity: 1 }],
);

export const blur = pageTransition(
  [
    { filter: "blur(0px)", opacity: 1 },
    { filter: "blur(10px)", opacity: 0 },
  ],
  [
    { filter: "blur(10px)", opacity: 0 },
    { filter: "blur(0px)", opacity: 1 },
  ],
);

export const slide = optionAwarePageTransition(resolveSlide);

export const spin = optionAwarePageTransition(resolveSpin);

export const rotate = optionAwarePageTransition(resolveRotate);

export const bounce = pageTransition(
  [
    { opacity: 1, transform: "scale(1)" },
    { opacity: 0, transform: "scale(0.94)" },
  ],
  [
    { opacity: 0, transform: "scale(0.96)" },
    { opacity: 1, transform: "scale(1)" },
  ],
);

export const push = pageTransition(
  [
    { opacity: 1, transform: "scale(1)" },
    { opacity: 0, transform: "scale(1.08)" },
  ],
  [
    { opacity: 0, transform: "scale(0.92)" },
    { opacity: 1, transform: "scale(1)" },
  ],
  DEPTH_EXIT_OPTIONS,
  DEPTH_ENTER_OPTIONS,
);

export const pull = pageTransition(
  [
    { opacity: 1, transform: "scale(1)" },
    { opacity: 0, transform: "scale(0.92)" },
  ],
  [
    { opacity: 0, transform: "scale(1.08)" },
    { opacity: 1, transform: "scale(1)" },
  ],
  DEPTH_EXIT_OPTIONS,
  DEPTH_ENTER_OPTIONS,
);
