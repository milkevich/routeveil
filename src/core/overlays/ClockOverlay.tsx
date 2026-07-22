import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  OverlayAnimationHandle,
  OverlayRendererProps,
} from "../transitions/types.js";
import {
  radialGeometry,
  readViewportSize,
} from "./radial-geometry.js";
import type { RadialOrigin } from "./radial-geometry.js";
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

export type ClockDirection = "clockwise" | "counterclockwise";

export type ClockOverlayOptions = Readonly<{
  color?: string;
  duration?: number;
  easing?: string;
  direction?: ClockDirection;
  startAngle?: number;
  origin?: RadialOrigin;
}>;

function safeStartAngle(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return -90;
  }

  return ((value + 180) % 360 + 360) % 360 - 180;
}

function setDashOffset(
  circle: SVGCircleElement | null,
  offset: number,
): void {
  if (circle) {
    circle.style.strokeDashoffset = String(offset);
  }
}

export function ClockOverlay({
  options,
  clickPosition,
  controllerRef,
}: OverlayRendererProps<ClockOverlayOptions>) {
  const clockOptions = options;
  const color = colorValue(clockOptions?.color, "#0a0a0a");
  const duration = finiteNumber(clockOptions?.duration, 720, 1, 3_000);
  const easing = safeEasing(clockOptions?.easing, "linear");
  const direction = choiceValue(
    clockOptions?.direction,
    ["clockwise", "counterclockwise"] as const,
    "clockwise",
  );
  const startAngle = safeStartAngle(clockOptions?.startAngle);
  const origin = choiceValue(
    clockOptions?.origin,
    ["center", "cursor"] as const,
    "center",
  );
  const coverStart = direction === "clockwise" ? 1 : -1;
  const revealEnd = -coverStart;
  const circleRef = useRef<SVGCircleElement | null>(null);
  const animationsRef = useRef<Animation[]>([]);
  const operationRef = useRef(0);
  const [viewport, setViewport] = useState(readViewportSize);

  useEffect(() => {
    const handleResize = () => {
      const nextViewport = readViewportSize();
      setViewport((currentViewport) =>
        currentViewport.width === nextViewport.width &&
        currentViewport.height === nextViewport.height
          ? currentViewport
          : nextViewport,
      );
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const geometry = useMemo(
    () => radialGeometry(viewport, origin, clickPosition, 2),
    [clickPosition, origin, viewport],
  );

  const reset = useCallback(() => {
    operationRef.current += 1;
    stopAnimations(animationsRef.current);
    setVisualState([circleRef.current], { opacity: 1 });
    setDashOffset(circleRef.current, coverStart);
  }, [coverStart]);

  const cover = useCallback(async () => {
    reset();
    const operation = operationRef.current;
    const circle = circleRef.current;
    const animation = circle
      ? startAnimation(
          circle,
          [
            { strokeDashoffset: coverStart },
            { strokeDashoffset: 0 },
          ],
          { duration, easing, fill: "forwards" },
        )
      : null;

    await finishAnimations([animation], animationsRef.current);
    if (operation === operationRef.current) {
      setDashOffset(circleRef.current, 0);
    }
  }, [coverStart, duration, easing, reset]);

  const reveal = useCallback(async () => {
    const operation = ++operationRef.current;
    stopAnimations(animationsRef.current);
    const circle = circleRef.current;
    setVisualState([circle], { opacity: 1 });
    setDashOffset(circleRef.current, 0);
    const animation = circle
      ? startAnimation(
          circle,
          [
            { strokeDashoffset: 0 },
            { strokeDashoffset: revealEnd },
          ],
          { duration, easing, fill: "forwards" },
        )
      : null;

    await finishAnimations([animation], animationsRef.current);
    if (operation === operationRef.current) {
      setDashOffset(circleRef.current, revealEnd);
    }
  }, [duration, easing, revealEnd]);

  useImperativeHandle<OverlayAnimationHandle, OverlayAnimationHandle>(
    controllerRef,
    () => ({ cover, reveal, reset }),
    [cover, reset, reveal],
  );
  useEffect(() => reset, [reset]);

  const svgWidth = Math.max(1, viewport.width);
  const svgHeight = Math.max(1, viewport.height);
  const sweepRadius = geometry.radius / 2;

  return (
    <svg
      aria-hidden="true"
      data-direction={direction}
      data-origin={origin}
      data-routeveil-clock=""
      height="100%"
      preserveAspectRatio="none"
      style={overlayFillStyle}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      width="100%"
    >
      <circle
        cx={geometry.x}
        cy={geometry.y}
        data-routeveil-clock-sweep=""
        fill="none"
        pathLength={1}
        r={sweepRadius}
        ref={circleRef}
        stroke={color}
        strokeDasharray="1 1"
        strokeLinecap="butt"
        strokeWidth={geometry.radius}
        style={{
          strokeDashoffset: coverStart,
          willChange: "stroke-dashoffset",
        }}
        transform={`rotate(${startAngle} ${geometry.x} ${geometry.y})`}
      />
    </svg>
  );
}
