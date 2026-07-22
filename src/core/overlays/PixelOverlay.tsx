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
  createPixelDelays,
  createPixelGridGeometry,
} from "./pixel-order.js";
import type { PixelOrigin } from "./pixel-order.js";
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

export type PixelOverlayOptions = Readonly<{
  columns?: number;
  rows?: number;
  color?: string;
  origin?: PixelOrigin;
  duration?: number;
  stagger?: number;
}>;

const PIXEL_ORIGINS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "center",
  "random",
  "cursor",
] as const satisfies readonly PixelOrigin[];

function seedFromId(id: string): number {
  let seed = 0;
  for (let index = 0; index < id.length; index += 1) {
    seed = (seed * 31 + id.charCodeAt(index)) >>> 0;
  }
  return seed / 4_294_967_295;
}

type ViewportSize = Readonly<{
  width: number;
  height: number;
}>;

function readViewportSize(): ViewportSize {
  if (typeof window === "undefined") {
    return { width: 0, height: 0 };
  }

  return {
    width: Math.max(0, window.innerWidth),
    height: Math.max(0, window.innerHeight),
  };
}

export function PixelOverlay({
  options,
  clickPosition,
  controllerRef,
}: OverlayRendererProps<PixelOverlayOptions>) {
  const pixelOptions = options;
  const columns = finiteInteger(pixelOptions?.columns, 16, 1, 64);
  const rows = finiteInteger(pixelOptions?.rows, 10, 1, 48);
  const color = colorValue(pixelOptions?.color, "#0a0a0a");
  const origin = choiceValue(pixelOptions?.origin, PIXEL_ORIGINS, "center");
  const duration = finiteNumber(pixelOptions?.duration, 180, 1, 2_000);
  const stagger = finiteNumber(pixelOptions?.stagger, 360, 0, 3_000);
  const count = columns * rows;
  const pixelRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const animationsRef = useRef<Animation[]>([]);
  const randomId = useId();
  const randomSeed = useMemo(() => seedFromId(randomId), [randomId]);
  const [viewportSize, setViewportSize] = useState(readViewportSize);

  useEffect(() => {
    const handleResize = () => {
      const nextSize = readViewportSize();
      setViewportSize((currentSize) =>
        currentSize.width === nextSize.width &&
        currentSize.height === nextSize.height
          ? currentSize
          : nextSize,
      );
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const geometry = useMemo(
    () =>
      createPixelGridGeometry({
        columns,
        rows,
        viewportWidth: viewportSize.width,
        viewportHeight: viewportSize.height,
      }),
    [columns, rows, viewportSize.height, viewportSize.width],
  );

  const pixels = useMemo(
    () => Array.from({ length: count }, (_, index) => index),
    [count],
  );

  const delays = useCallback(() => {
    return createPixelDelays({
      columns,
      rows,
      origin,
      maximumDelay: stagger,
      randomSeed,
      clickPosition,
      viewportWidth: viewportSize.width,
      viewportHeight: viewportSize.height,
    });
  }, [
    clickPosition,
    columns,
    origin,
    randomSeed,
    rows,
    stagger,
    viewportSize.height,
    viewportSize.width,
  ]);

  const reset = useCallback(() => {
    stopAnimations(animationsRef.current);
    setVisualState(pixelRefs.current, {
      opacity: 0,
      transform: "scale(0)",
      transformOrigin: "center",
    });
  }, []);

  const cover = useCallback(async () => {
    reset();
    const pixelDelays = delays();
    const animations = pixelRefs.current.map((pixel, index) => {
      if (!pixel) {
        return null;
      }

      return startAnimation(
        pixel,
        [
          { opacity: 0, transform: "scale(0)" },
          { opacity: 1, transform: "scale(1.04)" },
        ],
        {
          duration,
          delay: pixelDelays[index] ?? 0,
          easing: "steps(4, end)",
          fill: "forwards",
        },
      );
    });

    await finishAnimations(animations, animationsRef.current);
  }, [delays, duration, reset]);

  const reveal = useCallback(async () => {
    setVisualState(pixelRefs.current, {
      opacity: 1,
      transform: "scale(1.04)",
      transformOrigin: "center",
    });
    stopAnimations(animationsRef.current);
    const pixelDelays = delays();
    const animations = pixelRefs.current.map((pixel, index) => {
      if (!pixel) {
        return null;
      }

      return startAnimation(
        pixel,
        [
          { opacity: 1, transform: "scale(1.04)" },
          { opacity: 0, transform: "scale(0)" },
        ],
        {
          duration,
          delay: pixelDelays[index] ?? 0,
          easing: "steps(4, end)",
          fill: "forwards",
        },
      );
    });

    await finishAnimations(animations, animationsRef.current);
  }, [delays, duration]);

  useImperativeHandle<OverlayAnimationHandle, OverlayAnimationHandle>(
    controllerRef,
    () => ({ cover, reveal, reset }),
    [cover, reset, reveal],
  );

  useEffect(() => reset, [reset]);

  return (
    <div
      aria-hidden="true"
      data-routeveil-pixel-grid=""
      style={{
        ...overlayFillStyle,
        inset: "auto",
        left: geometry.offsetX,
        top: geometry.offsetY,
        width: geometry.gridWidth,
        height: geometry.gridHeight,
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, ${geometry.tileSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${geometry.tileSize}px)`,
      }}
    >
      {pixels.map((index) => (
        <span
          data-routeveil-pixel=""
          key={index}
          ref={(element) => {
            pixelRefs.current[index] = element;
          }}
          style={{
            width: geometry.tileSize,
            height: geometry.tileSize,
            backgroundColor: color,
            opacity: 0,
            transform: "scale(0)",
            transformOrigin: "center",
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}
