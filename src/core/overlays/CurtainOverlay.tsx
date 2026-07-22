import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { CSSProperties } from "react";
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

export type CurtainAxis = "horizontal" | "vertical";

export type CurtainOverlayOptions = Readonly<{
  color?: string;
  axis?: CurtainAxis;
  duration?: number;
  easing?: string;
}>;

const CURTAIN_AXES = ["horizontal", "vertical"] as const satisfies readonly CurtainAxis[];

function panelPosition(axis: CurtainAxis, index: number): CSSProperties {
  if (axis === "vertical") {
    return {
      left: 0,
      right: 0,
      height: "calc(50% + 1px)",
      ...(index === 0 ? { top: 0 } : { bottom: 0 }),
    };
  }

  return {
    top: 0,
    bottom: 0,
    width: "calc(50% + 1px)",
    ...(index === 0 ? { left: 0 } : { right: 0 }),
  };
}

function panelOrigin(
  axis: CurtainAxis,
  index: number,
  phase: "cover" | "reveal",
): string {
  if (axis === "vertical") {
    if (phase === "cover") {
      return index === 0 ? "center top" : "center bottom";
    }
    return index === 0 ? "center bottom" : "center top";
  }

  if (phase === "cover") {
    return index === 0 ? "left center" : "right center";
  }
  return index === 0 ? "right center" : "left center";
}

export function CurtainOverlay({
  options,
  controllerRef,
}: OverlayRendererProps<CurtainOverlayOptions>) {
  const curtainOptions = options;
  const color = colorValue(curtainOptions?.color, "#0a0a0a");
  const axis = choiceValue(curtainOptions?.axis, CURTAIN_AXES, "horizontal");
  const duration = finiteNumber(curtainOptions?.duration, 540, 1, 3_000);
  const easing = safeEasing(
    curtainOptions?.easing,
    "cubic-bezier(0.76, 0, 0.24, 1)",
  );
  const panelRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const animationsRef = useRef<Animation[]>([]);
  const hiddenTransform = axis === "horizontal" ? "scaleX(0)" : "scaleY(0)";
  const visibleTransform = axis === "horizontal" ? "scaleX(1)" : "scaleY(1)";

  const reset = useCallback(() => {
    stopAnimations(animationsRef.current);
    panelRefs.current.forEach((panel, index) => {
      setVisualState([panel], {
        opacity: 1,
        transform: hiddenTransform,
        transformOrigin: panelOrigin(axis, index, "cover"),
      });
    });
  }, [axis, hiddenTransform]);

  const cover = useCallback(async () => {
    reset();
    const animations = panelRefs.current.map((panel) =>
      panel
        ? startAnimation(
            panel,
            [
              { transform: hiddenTransform },
              { transform: visibleTransform },
            ],
            { duration, easing, fill: "forwards" },
          )
        : null,
    );
    await finishAnimations(animations, animationsRef.current);
  }, [duration, easing, hiddenTransform, reset, visibleTransform]);

  const reveal = useCallback(async () => {
    panelRefs.current.forEach((panel, index) => {
      setVisualState([panel], {
        opacity: 1,
        transform: visibleTransform,
        transformOrigin: panelOrigin(axis, index, "reveal"),
      });
    });
    stopAnimations(animationsRef.current);
    const animations = panelRefs.current.map((panel) =>
      panel
        ? startAnimation(
            panel,
            [
              { transform: visibleTransform },
              { transform: hiddenTransform },
            ],
            { duration, easing, fill: "forwards" },
          )
        : null,
    );
    await finishAnimations(animations, animationsRef.current);
  }, [axis, duration, easing, hiddenTransform, visibleTransform]);

  useImperativeHandle<OverlayAnimationHandle, OverlayAnimationHandle>(
    controllerRef,
    () => ({ cover, reveal, reset }),
    [cover, reset, reveal],
  );
  useEffect(() => reset, [reset]);

  return (
    <div
      aria-hidden="true"
      data-routeveil-curtain=""
      style={overlayFillStyle}
    >
      {[0, 1].map((index) => (
        <span
          data-routeveil-curtain-panel=""
          key={index}
          ref={(element) => {
            panelRefs.current[index] = element;
          }}
          style={{
            position: "absolute",
            ...panelPosition(axis, index),
            backgroundColor: color,
            transform: hiddenTransform,
            transformOrigin: panelOrigin(axis, index, "cover"),
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}
