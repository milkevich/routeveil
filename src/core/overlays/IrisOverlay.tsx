import {
  useCallback,
  useEffect,
  useId,
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
  safeRadialOrigin,
  svgIdentifier,
} from "./radial-geometry.js";
import type { RadialOrigin } from "./radial-geometry.js";
import {
  colorValue,
  finishAnimations,
  finiteNumber,
  overlayFillStyle,
  safeEasing,
  setVisualState,
  startAnimation,
  stopAnimations,
} from "./shared.js";

export type IrisOverlayOptions = Readonly<{
  color?: string;
  origin?: RadialOrigin;
  duration?: number;
  easing?: string;
}>;

export function IrisOverlay({
  options,
  clickPosition,
  controllerRef,
}: OverlayRendererProps<IrisOverlayOptions>) {
  const irisOptions = options;
  const color = colorValue(irisOptions?.color, "#0a0a0a");
  const origin = safeRadialOrigin(irisOptions?.origin);
  const duration = finiteNumber(irisOptions?.duration, 640, 1, 3_000);
  const easing = safeEasing(
    irisOptions?.easing,
    "cubic-bezier(0.76, 0, 0.24, 1)",
  );
  const circleRef = useRef<SVGCircleElement | null>(null);
  const animationsRef = useRef<Animation[]>([]);
  const [viewport, setViewport] = useState(readViewportSize);
  const reactId = useId();
  const maskId = useMemo(
    () => svgIdentifier("routeveil-iris-mask", reactId),
    [reactId],
  );

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
    stopAnimations(animationsRef.current);
    setVisualState([circleRef.current], {
      opacity: 1,
      transform: "scale(1)",
      transformOrigin: "center",
    });
  }, []);

  const cover = useCallback(async () => {
    reset();
    const circle = circleRef.current;
    const animation = circle
      ? startAnimation(
          circle,
          [{ transform: "scale(1)" }, { transform: "scale(0)" }],
          { duration, easing, fill: "forwards" },
        )
      : null;

    await finishAnimations([animation], animationsRef.current);
  }, [duration, easing, reset]);

  const reveal = useCallback(async () => {
    const circle = circleRef.current;
    stopAnimations(animationsRef.current);
    setVisualState([circle], {
      opacity: 1,
      transform: "scale(0)",
      transformOrigin: "center",
    });
    const animation = circle
      ? startAnimation(
          circle,
          [{ transform: "scale(0)" }, { transform: "scale(1)" }],
          { duration, easing, fill: "forwards" },
        )
      : null;

    await finishAnimations([animation], animationsRef.current);
  }, [duration, easing]);

  useImperativeHandle<OverlayAnimationHandle, OverlayAnimationHandle>(
    controllerRef,
    () => ({ cover, reveal, reset }),
    [cover, reset, reveal],
  );
  useEffect(() => reset, [reset]);

  const svgWidth = Math.max(1, viewport.width);
  const svgHeight = Math.max(1, viewport.height);

  return (
    <svg
      aria-hidden="true"
      data-routeveil-iris=""
      height="100%"
      preserveAspectRatio="none"
      style={overlayFillStyle}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      width="100%"
    >
      <defs>
        <mask
          height={svgHeight}
          id={maskId}
          maskContentUnits="userSpaceOnUse"
          maskUnits="userSpaceOnUse"
          style={{ maskType: "luminance" }}
          width={svgWidth}
          x="0"
          y="0"
        >
          <rect fill="white" height={svgHeight} width={svgWidth} x="0" y="0" />
          <circle
            cx={geometry.x}
            cy={geometry.y}
            fill="black"
            r={geometry.radius}
            ref={circleRef}
            style={{
              transform: "scale(1)",
              transformBox: "fill-box",
              transformOrigin: "center",
              willChange: "transform",
            }}
          />
        </mask>
      </defs>
      <rect
        data-routeveil-iris-cover=""
        fill={color}
        height={svgHeight}
        mask={`url(#${maskId})`}
        width={svgWidth}
        x="0"
        y="0"
      />
    </svg>
  );
}
