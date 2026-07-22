import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
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
  finiteInteger,
  finiteNumber,
  overlayFillStyle,
  setVisualState,
  startAnimation,
  stopAnimations,
} from "./shared.js";

export type VenetianDirection = "horizontal" | "vertical";

export type VenetianOverlayOptions = Readonly<{
  color?: string;
  direction?: VenetianDirection;
  count?: number;
  duration?: number;
  stagger?: number;
  alternate?: boolean;
}>;

const VENETIAN_DIRECTIONS = [
  "horizontal",
  "vertical",
] as const satisfies readonly VenetianDirection[];

function delayForStrip(index: number, count: number, stagger: number): number {
  return count <= 1 ? 0 : (index / (count - 1)) * stagger;
}

function stripOrigin(
  direction: VenetianDirection,
  index: number,
  alternate: boolean,
): string {
  const hingesFromStart = !alternate || index % 2 === 0;

  if (direction === "horizontal") {
    return hingesFromStart ? "center top" : "center bottom";
  }

  return hingesFromStart ? "left center" : "right center";
}

function openAngle(index: number, alternate: boolean): number {
  return alternate && index % 2 === 1 ? -88 : 88;
}

function rotation(direction: VenetianDirection, degrees: number): string {
  return direction === "horizontal"
    ? `rotateX(${degrees}deg)`
    : `rotateY(${degrees}deg)`;
}

function stripPosition(
  direction: VenetianDirection,
  index: number,
  count: number,
): CSSProperties {
  const size = 100 / count;
  const offset = index * size;

  if (direction === "horizontal") {
    return {
      left: 0,
      top: `${offset}%`,
      width: "100%",
      height: `calc(${size}% + 2px)`,
    };
  }

  return {
    left: `${offset}%`,
    top: 0,
    width: `calc(${size}% + 2px)`,
    height: "100%",
  };
}

function stripShading(direction: VenetianDirection): string {
  return direction === "horizontal"
    ? "inset 0 1px rgba(255,255,255,0.12), inset 0 -2px rgba(0,0,0,0.18)"
    : "inset 1px 0 rgba(255,255,255,0.12), inset -2px 0 rgba(0,0,0,0.18)";
}

export function VenetianOverlay({
  options,
  controllerRef,
}: OverlayRendererProps<VenetianOverlayOptions>) {
  const venetianOptions = options;
  const direction = choiceValue(
    venetianOptions?.direction,
    VENETIAN_DIRECTIONS,
    "horizontal",
  );
  const count = finiteInteger(
    venetianOptions?.count,
    direction === "horizontal" ? 14 : 18,
    2,
    64,
  );
  const color = colorValue(venetianOptions?.color, "#0a0a0a");
  const duration = finiteNumber(venetianOptions?.duration, 480, 1, 3_000);
  const stagger = finiteNumber(venetianOptions?.stagger, 260, 0, 2_000);
  const alternate =
    typeof venetianOptions?.alternate === "boolean"
      ? venetianOptions.alternate
      : true;
  const stripRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const animationsRef = useRef<Animation[]>([]);
  const indices = useMemo(
    () => Array.from({ length: count }, (_, index) => index),
    [count],
  );

  const reset = useCallback(() => {
    stopAnimations(animationsRef.current);
    stripRefs.current.forEach((strip, index) => {
      setVisualState([strip], {
        opacity: 0,
        transform: rotation(direction, openAngle(index, alternate)),
        transformOrigin: stripOrigin(direction, index, alternate),
      });
    });
  }, [alternate, direction]);

  const cover = useCallback(async () => {
    reset();
    const animations = stripRefs.current.map((strip, index) => {
      if (!strip) {
        return null;
      }

      const angle = openAngle(index, alternate);
      return startAnimation(
        strip,
        [
          { opacity: 0, transform: rotation(direction, angle) },
          {
            opacity: 1,
            offset: 0.55,
            transform: rotation(direction, angle * 0.45),
          },
          { opacity: 1, transform: rotation(direction, 0) },
        ],
        {
          duration,
          delay: delayForStrip(index, count, stagger),
          easing: "cubic-bezier(0.65, 0, 0.35, 1)",
          fill: "forwards",
        },
      );
    });

    await finishAnimations(animations, animationsRef.current);
  }, [alternate, count, direction, duration, reset, stagger]);

  const reveal = useCallback(async () => {
    stripRefs.current.forEach((strip, index) => {
      setVisualState([strip], {
        opacity: 1,
        transform: rotation(direction, 0),
        transformOrigin: stripOrigin(direction, index, alternate),
      });
    });
    stopAnimations(animationsRef.current);

    const animations = stripRefs.current.map((strip, index) => {
      if (!strip) {
        return null;
      }

      const angle = openAngle(index, alternate);
      return startAnimation(
        strip,
        [
          { opacity: 1, transform: rotation(direction, 0) },
          {
            opacity: 1,
            offset: 0.45,
            transform: rotation(direction, angle * 0.45),
          },
          { opacity: 0, transform: rotation(direction, angle) },
        ],
        {
          duration,
          delay: delayForStrip(count - index - 1, count, stagger),
          easing: "cubic-bezier(0.65, 0, 0.35, 1)",
          fill: "forwards",
        },
      );
    });

    await finishAnimations(animations, animationsRef.current);
  }, [alternate, count, direction, duration, stagger]);

  useImperativeHandle<OverlayAnimationHandle, OverlayAnimationHandle>(
    controllerRef,
    () => ({ cover, reveal, reset }),
    [cover, reset, reveal],
  );
  useEffect(() => reset, [reset]);

  return (
    <div
      aria-hidden="true"
      data-direction={direction}
      data-routeveil-venetian=""
      style={{
        ...overlayFillStyle,
        perspective: "1000px",
        perspectiveOrigin: "center",
        transformStyle: "preserve-3d",
      }}
    >
      {indices.map((index) => (
        <span
          data-routeveil-venetian-strip=""
          key={index}
          ref={(element) => {
            stripRefs.current[index] = element;
          }}
          style={{
            position: "absolute",
            ...stripPosition(direction, index, count),
            backgroundColor: color,
            backfaceVisibility: "hidden",
            boxShadow: stripShading(direction),
            opacity: 0,
            transform: rotation(direction, openAngle(index, alternate)),
            transformOrigin: stripOrigin(direction, index, alternate),
            transformStyle: "preserve-3d",
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}
