import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
} from "react";
import type {
  OverlayAnimationHandle,
  OverlayRendererProps,
} from "../transitions/types.js";
import {
  colorValue,
  finiteInteger,
  finiteNumber,
  overlayFillStyle,
} from "./shared.js";
import { createDissolveNoiseField } from "./dissolve-noise.js";
import type { DissolveNoiseField } from "./dissolve-noise.js";

export type DissolveOverlayOptions = Readonly<{
  color?: string;
  duration?: number;
  grainSize?: number;
  softness?: number;
  seed?: number;
}>;

type ActiveFrame = {
  id: number;
  resolve: () => void;
};

function hashText(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function smoothProgress(progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  return clamped * clamped * (3 - 2 * clamped);
}

export function DissolveOverlay({
  options,
  controllerRef,
}: OverlayRendererProps<DissolveOverlayOptions>) {
  const dissolveOptions = options;
  const color = colorValue(dissolveOptions?.color, "#0a0a0a");
  const duration = finiteNumber(dissolveOptions?.duration, 680, 1, 4_000);
  const grainSize = finiteInteger(dissolveOptions?.grainSize, 7, 2, 32);
  const softness = finiteNumber(dissolveOptions?.softness, 0.12, 0, 0.5);
  const generatedId = useId();
  const seed = Number.isFinite(dissolveOptions?.seed)
    ? Math.trunc(dissolveOptions?.seed ?? 0) >>> 0
    : hashText(generatedId);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fieldRef = useRef<DissolveNoiseField | null>(null);
  const activeFrameRef = useRef<ActiveFrame | null>(null);
  const progressRef = useRef(0);

  const configureCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") {
      return;
    }

    let columns = Math.max(1, Math.ceil(window.innerWidth / grainSize));
    let rows = Math.max(1, Math.ceil(window.innerHeight / grainSize));
    const maximumCells = 180_000;
    const cellCount = columns * rows;
    if (cellCount > maximumCells) {
      const reduction = Math.sqrt(cellCount / maximumCells);
      columns = Math.max(1, Math.floor(columns / reduction));
      rows = Math.max(1, Math.floor(rows / reduction));
    }
    if (canvas.width !== columns || canvas.height !== rows) {
      canvas.width = columns;
      canvas.height = rows;
    }
    fieldRef.current = createDissolveNoiseField(columns, rows, seed);
  }, [grainSize, seed]);

  const draw = useCallback((rawProgress: number) => {
    const canvas = canvasRef.current;
    const field = fieldRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !field || !context) {
      return;
    }

    const progress = Math.min(1, Math.max(0, rawProgress));
    progressRef.current = progress;
    context.clearRect(0, 0, field.columns, field.rows);
    if (progress <= 0) {
      return;
    }

    context.fillStyle = color;
    context.globalAlpha = 1;
    if (progress >= 1) {
      context.fillRect(0, 0, field.columns, field.rows);
      return;
    }

    const image = context.createImageData(field.columns, field.rows);
    for (let index = 0; index < field.thresholds.length; index += 1) {
      const threshold = field.thresholds[index] ?? 1;
      const alpha = softness === 0
        ? progress >= threshold ? 1 : 0
        : Math.min(1, Math.max(0, (progress - threshold) / softness + 0.5));
      const pixelIndex = index * 4;
      image.data[pixelIndex] = 255;
      image.data[pixelIndex + 1] = 255;
      image.data[pixelIndex + 2] = 255;
      image.data[pixelIndex + 3] = Math.round(alpha * 255);
    }
    context.putImageData(image, 0, 0);
    context.save();
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-in";
    context.fillStyle = color;
    context.fillRect(0, 0, field.columns, field.rows);
    context.restore();
  }, [color, softness]);

  const stop = useCallback(() => {
    const activeFrame = activeFrameRef.current;
    if (!activeFrame) {
      return;
    }

    cancelAnimationFrame(activeFrame.id);
    activeFrameRef.current = null;
    activeFrame.resolve();
  }, []);

  const animate = useCallback((from: number, to: number): Promise<void> => {
    stop();
    configureCanvas();

    if (typeof requestAnimationFrame !== "function") {
      draw(to);
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
        const elapsed = timestamp - startedAt;
        const linear = Math.min(1, elapsed / duration);
        const eased = smoothProgress(linear);
        draw(from + (to - from) * eased);

        if (linear >= 1) {
          draw(to);
          activeFrameRef.current = null;
          resolve();
          return;
        }

        activeFrame.id = requestAnimationFrame(step);
      };

      activeFrameRef.current = activeFrame;
      draw(from);
      activeFrame.id = requestAnimationFrame(step);
    });
  }, [configureCanvas, draw, duration, stop]);

  const reset = useCallback(() => {
    stop();
    configureCanvas();
    draw(0);
  }, [configureCanvas, draw, stop]);

  const cover = useCallback(async () => {
    reset();
    await animate(0, 1);
  }, [animate, reset]);

  const reveal = useCallback(async () => {
    configureCanvas();
    draw(1);
    await animate(1, 0);
  }, [animate, configureCanvas, draw]);

  useImperativeHandle<OverlayAnimationHandle, OverlayAnimationHandle>(
    controllerRef,
    () => ({ cover, reveal, reset }),
    [cover, reset, reveal],
  );

  useEffect(() => {
    configureCanvas();
    draw(0);
    const handleResize = () => {
      configureCanvas();
      draw(progressRef.current);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      stop();
    };
  }, [configureCanvas, draw, stop]);

  return (
    <canvas
      aria-hidden="true"
      data-routeveil-dissolve=""
      ref={canvasRef}
      style={{
        ...overlayFillStyle,
        imageRendering: "pixelated",
      }}
    />
  );
}
