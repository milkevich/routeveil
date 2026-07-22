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
import type { IrisOverlayOptions } from "./IrisOverlay.js";
import {
  radialGeometry,
  readViewportSize,
  safeRadialOrigin,
} from "./radial-geometry.js";
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

export type HaloOverlayOptions = IrisOverlayOptions;

export function HaloOverlay({
  options,
  clickPosition,
  controllerRef,
}: OverlayRendererProps<HaloOverlayOptions>) {
  const haloOptions = options;
  const color = colorValue(haloOptions?.color, "#0a0a0a");
  const origin = safeRadialOrigin(haloOptions?.origin);
  const duration = finiteNumber(haloOptions?.duration, 640, 1, 3_000);
  const easing = safeEasing(
    haloOptions?.easing,
    "cubic-bezier(0.76, 0, 0.24, 1)",
  );
  const circleRef = useRef<SVGCircleElement | null>(null);
  const animationsRef = useRef<Animation[]>([]);
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
    stopAnimations(animationsRef.current);
    setVisualState([circleRef.current], {
      opacity: 1,
      transform: "scale(0)",
      transformOrigin: "center",
    });
  }, []);

  const cover = useCallback(async () => {
    reset();
    const circle = circleRef.current;
    const animation = circle
      ? startAnimation(
          circle,
          [{ transform: "scale(0)" }, { transform: "scale(1)" }],
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
      transform: "scale(1)",
      transformOrigin: "center",
    });
    const animation = circle
      ? startAnimation(
          circle,
          [{ transform: "scale(1)" }, { transform: "scale(0)" }],
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
      data-routeveil-halo=""
      height="100%"
      preserveAspectRatio="none"
      style={overlayFillStyle}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      width="100%"
    >
      <circle
        cx={geometry.x}
        cy={geometry.y}
        data-routeveil-halo-circle=""
        fill={color}
        r={geometry.radius}
        ref={circleRef}
        style={{
          transform: "scale(0)",
          transformBox: "fill-box",
          transformOrigin: "center",
          willChange: "transform",
        }}
      />
    </svg>
  );
}
