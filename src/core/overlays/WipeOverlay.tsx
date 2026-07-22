import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type {
  OverlayAnimationHandle,
  OverlayRendererProps,
} from "../transitions/types.js";
import {
  colorValue,
  choiceValue,
  finishAnimations,
  finiteNumber,
  overlayFillStyle,
  safeEasing,
  setVisualState,
  startAnimation,
  stopAnimations,
} from "./shared.js";

export type WipeDirection = "right" | "left" | "down" | "up";

export type WipeOverlayOptions = Readonly<{
  color?: string;
  direction?: WipeDirection;
  duration?: number;
  easing?: string;
}>;

const WIPE_DIRECTIONS = ["right", "left", "down", "up"] as const satisfies readonly WipeDirection[];

function wipeTransforms(direction: WipeDirection): readonly [string, string] {
  switch (direction) {
    case "left":
      return ["translate3d(101%, 0, 0)", "translate3d(-101%, 0, 0)"];
    case "down":
      return ["translate3d(0, -101%, 0)", "translate3d(0, 101%, 0)"];
    case "up":
      return ["translate3d(0, 101%, 0)", "translate3d(0, -101%, 0)"];
    case "right":
      return ["translate3d(-101%, 0, 0)", "translate3d(101%, 0, 0)"];
  }
}

export function WipeOverlay({
  options,
  controllerRef,
}: OverlayRendererProps<WipeOverlayOptions>) {
  const wipeOptions = options;
  const color = colorValue(wipeOptions?.color, "#0a0a0a");
  const direction = choiceValue(
    wipeOptions?.direction,
    WIPE_DIRECTIONS,
    "right",
  );
  const duration = finiteNumber(wipeOptions?.duration, 620, 1, 3_000);
  const easing = safeEasing(
    wipeOptions?.easing,
    "cubic-bezier(0.77, 0, 0.18, 1)",
  );
  const [coverStart, revealEnd] = wipeTransforms(direction);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const animationsRef = useRef<Animation[]>([]);

  const reset = useCallback(() => {
    stopAnimations(animationsRef.current);
    setVisualState([panelRef.current], {
      opacity: 1,
      transform: coverStart,
    });
  }, [coverStart]);

  const cover = useCallback(async () => {
    reset();
    const animation = panelRef.current
      ? startAnimation(
          panelRef.current,
          [{ transform: coverStart }, { transform: "translate3d(0, 0, 0)" }],
          { duration, easing, fill: "forwards" },
        )
      : null;
    await finishAnimations([animation], animationsRef.current);
  }, [coverStart, duration, easing, reset]);

  const reveal = useCallback(async () => {
    setVisualState([panelRef.current], {
      opacity: 1,
      transform: "translate3d(0, 0, 0)",
    });
    stopAnimations(animationsRef.current);
    const animation = panelRef.current
      ? startAnimation(
          panelRef.current,
          [{ transform: "translate3d(0, 0, 0)" }, { transform: revealEnd }],
          { duration, easing, fill: "forwards" },
        )
      : null;
    await finishAnimations([animation], animationsRef.current);
  }, [duration, easing, revealEnd]);

  useImperativeHandle<OverlayAnimationHandle, OverlayAnimationHandle>(
    controllerRef,
    () => ({ cover, reveal, reset }),
    [cover, reset, reveal],
  );
  useEffect(() => reset, [reset]);

  return (
    <div
      aria-hidden="true"
      data-routeveil-wipe=""
      ref={panelRef}
      style={{
        ...overlayFillStyle,
        backgroundColor: color,
        transform: coverStart,
        willChange: "transform",
      }}
    />
  );
}
