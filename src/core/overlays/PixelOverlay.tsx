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
  finiteInteger,
  finiteNumber,
  overlayFillStyle,
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

const CELL_RESOLUTION = 8;
const STEP_COUNT = 4;

type ActiveFrame = {
  id: number;
  resolve: () => void;
};

type PixelPhase = "clear" | "cover" | "reveal";

type PixelFrame = Readonly<{
  phase: PixelPhase;
  elapsed: number;
  delays: readonly number[];
}>;

type ViewportSize = Readonly<{
  width: number;
  height: number;
}>;

function seedFromId(id: string): number {
  let seed = 0;
  for (let index = 0; index < id.length; index += 1) {
    seed = (seed * 31 + id.charCodeAt(index)) >>> 0;
  }
  return seed / 4_294_967_295;
}

function readViewportSize(): ViewportSize {
  if (typeof window === "undefined") {
    return { width: 0, height: 0 };
  }

  return {
    width: Math.max(0, window.innerWidth),
    height: Math.max(0, window.innerHeight),
  };
}

function largestDelay(delays: readonly number[]): number {
  let maximum = 0;
  for (const delay of delays) {
    maximum = Math.max(maximum, delay);
  }
  return maximum;
}

function completedSteps(elapsed: number, delay: number, duration: number): number {
  const progress = Math.min(1, Math.max(0, (elapsed - delay) / duration));
  return progress >= 1 ? STEP_COUNT : Math.floor(progress * STEP_COUNT);
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const activeFrameRef = useRef<ActiveFrame | null>(null);
  const frameRef = useRef<PixelFrame>({ phase: "clear", elapsed: 0, delays: [] });
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

  const getContext = useCallback(() => {
    if (contextRef.current) {
      return contextRef.current;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    try {
      contextRef.current = canvas.getContext("2d");
    } catch {
      contextRef.current = null;
    }
    return contextRef.current;
  }, []);

  const draw = useCallback((frame: PixelFrame): boolean => {
    frameRef.current = frame;
    const canvas = canvasRef.current;
    const context = getContext();
    if (!canvas || !context) {
      return false;
    }

    const canvasWidth = columns * CELL_RESOLUTION;
    const canvasHeight = rows * CELL_RESOLUTION;
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }

    canvas.style.backgroundColor = "transparent";
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.globalAlpha = 1;
    if (frame.phase === "clear") {
      return true;
    }

    const totalDuration = duration + largestDelay(frame.delays);
    if (
      (frame.phase === "cover" && frame.elapsed >= totalDuration) ||
      (frame.phase === "reveal" && frame.elapsed <= 0)
    ) {
      context.fillStyle = color;
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      return true;
    }
    if (frame.phase === "reveal" && frame.elapsed >= totalDuration) {
      return true;
    }

    context.fillStyle = color;
    for (let index = 0; index < columns * rows; index += 1) {
      const progressed = completedSteps(
        frame.elapsed,
        frame.delays[index] ?? 0,
        duration,
      );
      const level = frame.phase === "cover"
        ? progressed
        : STEP_COUNT - progressed;
      if (level <= 0) {
        continue;
      }

      const size = (CELL_RESOLUTION * level) / STEP_COUNT;
      const column = index % columns;
      const row = Math.floor(index / columns);
      const inset = (CELL_RESOLUTION - size) / 2;
      context.globalAlpha = level / STEP_COUNT;
      context.fillRect(
        column * CELL_RESOLUTION + inset,
        row * CELL_RESOLUTION + inset,
        size,
        size,
      );
    }
    context.globalAlpha = 1;
    return true;
  }, [color, columns, duration, getContext, rows]);

  const stop = useCallback(() => {
    const activeFrame = activeFrameRef.current;
    if (!activeFrame) {
      return;
    }

    cancelAnimationFrame(activeFrame.id);
    activeFrameRef.current = null;
    activeFrame.resolve();
  }, []);

  const animate = useCallback((phase: Exclude<PixelPhase, "clear">) => {
    stop();
    const pixelDelays = delays();
    const totalDuration = duration + largestDelay(pixelDelays);
    const initialFrame = { phase, elapsed: 0, delays: pixelDelays } as const;
    const hasContext = draw(initialFrame);
    const canvas = canvasRef.current;

    if (!hasContext) {
      if (canvas) {
        canvas.style.backgroundColor = phase === "cover" ? color : "transparent";
      }
      frameRef.current = {
        phase,
        elapsed: totalDuration,
        delays: pixelDelays,
      };
      return Promise.resolve();
    }

    if (typeof requestAnimationFrame !== "function") {
      draw({ phase, elapsed: totalDuration, delays: pixelDelays });
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      let startedAt: number | null = null;
      const activeFrame: ActiveFrame = { id: 0, resolve };

      const step = (timestamp: number) => {
        if (activeFrameRef.current !== activeFrame) {
          return;
        }

        startedAt ??= timestamp;
        const elapsed = Math.min(totalDuration, timestamp - startedAt);
        draw({ phase, elapsed, delays: pixelDelays });

        if (elapsed >= totalDuration) {
          activeFrameRef.current = null;
          resolve();
          return;
        }

        activeFrame.id = requestAnimationFrame(step);
      };

      activeFrameRef.current = activeFrame;
      activeFrame.id = requestAnimationFrame(step);
    });
  }, [color, delays, draw, duration, stop]);

  const reset = useCallback(() => {
    stop();
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.backgroundColor = "transparent";
    }
    draw({ phase: "clear", elapsed: 0, delays: [] });
  }, [draw, stop]);

  const cover = useCallback(async () => {
    reset();
    await animate("cover");
  }, [animate, reset]);

  const reveal = useCallback(async () => {
    await animate("reveal");
  }, [animate]);

  useImperativeHandle<OverlayAnimationHandle, OverlayAnimationHandle>(
    controllerRef,
    () => ({ cover, reveal, reset }),
    [cover, reset, reveal],
  );

  useEffect(() => {
    draw(frameRef.current);
  }, [draw]);

  useEffect(() => () => stop(), [stop]);

  return (
    <canvas
      aria-hidden="true"
      data-routeveil-pixel-grid=""
      height={rows * CELL_RESOLUTION}
      ref={canvasRef}
      width={columns * CELL_RESOLUTION}
      style={{
        ...overlayFillStyle,
        inset: "auto",
        left: geometry.offsetX,
        top: geometry.offsetY,
        width: geometry.gridWidth,
        height: geometry.gridHeight,
        display: "block",
        imageRendering: "pixelated",
      }}
    />
  );
}
