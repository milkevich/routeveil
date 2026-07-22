import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import type {
  ClickPosition,
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

export type MosaicOrigin = "cursor" | "center" | "random";

export type MosaicOverlayOptions = Readonly<{
  colors?: readonly string[];
  columns?: number;
  rows?: number;
  duration?: number;
  stagger?: number;
  rotation?: number;
  seed?: number;
  origin?: MosaicOrigin;
}>;

const MOSAIC_ORIGINS = ["cursor", "center", "random"] as const satisfies readonly MosaicOrigin[];

type MosaicTile = Readonly<{
  id: number;
  left: number;
  top: number;
  width: number;
  height: number;
  rotation: number;
  randomOrder: number;
  colorIndex: number;
}>;

type ViewportSize = Readonly<{
  width: number;
  height: number;
}>;

const DEFAULT_COLORS = ["#0a0a0a", "#171717", "#262626"] as const;

function readViewport(): ViewportSize {
  if (typeof window === "undefined") {
    return { width: 1, height: 1 };
  }

  return {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
  };
}

function normalizeSeed(seed: number): number {
  return (Math.trunc(seed) >>> 0) || 0x6d2b79f5;
}

function createRandom(seed: number): () => number {
  let state = normalizeSeed(seed);

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function randomizedSegments(count: number, random: () => number): number[] {
  const weights = Array.from({ length: count }, () => 0.55 + random() * 0.9);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => (weight / total) * 100);
}

function createTiles(
  columns: number,
  rows: number,
  rotation: number,
  seed: number,
  colorCount: number,
): MosaicTile[] {
  const random = createRandom(seed);
  const rowHeights = randomizedSegments(rows, random);
  const tiles: MosaicTile[] = [];
  let top = 0;
  let id = 0;

  for (const height of rowHeights) {
    const columnWidths = randomizedSegments(columns, random);
    let left = 0;

    for (const width of columnWidths) {
      const signedRotation = (random() * 2 - 1) * rotation;
      tiles.push({
        id,
        left,
        top,
        width,
        height,
        rotation: signedRotation,
        randomOrder: random(),
        colorIndex: Math.floor(random() * colorCount),
      });
      id += 1;
      left += width;
    }

    top += height;
  }

  return tiles;
}

function colorsValue(colors: readonly string[] | undefined): readonly string[] {
  if (!Array.isArray(colors) || colors.length === 0) {
    return DEFAULT_COLORS;
  }

  return colors.map(
    (color, index) => colorValue(
      typeof color === "string" ? color : undefined,
      DEFAULT_COLORS[index % DEFAULT_COLORS.length] ?? DEFAULT_COLORS[0],
    ),
  );
}

function normalizedOrigin(
  origin: MosaicOrigin,
  clickPosition: ClickPosition | undefined,
  viewport: ViewportSize,
): Readonly<{ x: number; y: number }> {
  if (origin !== "cursor" || !clickPosition) {
    return { x: 50, y: 50 };
  }

  return {
    x: Math.min(100, Math.max(0, (clickPosition.x / viewport.width) * 100)),
    y: Math.min(100, Math.max(0, (clickPosition.y / viewport.height) * 100)),
  };
}

function tileDelays(
  tiles: readonly MosaicTile[],
  origin: MosaicOrigin,
  clickPosition: ClickPosition | undefined,
  viewport: ViewportSize,
  stagger: number,
): number[] {
  if (stagger === 0 || tiles.length <= 1) {
    return tiles.map(() => 0);
  }

  if (origin === "random") {
    const ordered = [...tiles].sort(
      (left, right) => left.randomOrder - right.randomOrder,
    );
    const rankById = new Map(
      ordered.map((tile, rank) => [tile.id, rank] as const),
    );

    return tiles.map(
      (tile) => ((rankById.get(tile.id) ?? 0) / (tiles.length - 1)) * stagger,
    );
  }

  const point = normalizedOrigin(origin, clickPosition, viewport);
  const distances = tiles.map((tile) => {
    const x = tile.left + tile.width / 2;
    const y = tile.top + tile.height / 2;
    return Math.hypot(
      ((x - point.x) / 100) * viewport.width,
      ((y - point.y) / 100) * viewport.height,
    );
  });
  const maximumDistance = Math.max(...distances, 1);
  return distances.map((distance) => (distance / maximumDistance) * stagger);
}

function tilePosition(tile: MosaicTile): CSSProperties {
  return {
    left: `${tile.left}%`,
    top: `${tile.top}%`,
    width: `calc(${tile.width}% + 1px)`,
    height: `calc(${tile.height}% + 1px)`,
  };
}

function hiddenTransform(rotation: number): string {
  return `scale(0.12) rotate(${rotation}deg)`;
}

const VISIBLE_TRANSFORM = "scale(1.025) rotate(0deg)";

export function MosaicOverlay({
  options,
  clickPosition,
  controllerRef,
}: OverlayRendererProps<MosaicOverlayOptions>) {
  const mosaicOptions = options;
  const columns = finiteInteger(mosaicOptions?.columns, 7, 1, 18);
  const rows = finiteInteger(mosaicOptions?.rows, 5, 1, 14);
  const duration = finiteNumber(mosaicOptions?.duration, 340, 1, 3_000);
  const stagger = finiteNumber(mosaicOptions?.stagger, 520, 0, 3_000);
  const rotation = finiteNumber(mosaicOptions?.rotation, 9, 0, 45);
  const origin = choiceValue(
    mosaicOptions?.origin,
    MOSAIC_ORIGINS,
    "center",
  );
  const colors = colorsValue(mosaicOptions?.colors);
  const [runSeed] = useState(() =>
    Math.floor(Math.random() * 4_294_967_296),
  );
  const [viewport] = useState(readViewport);
  const seed =
    typeof mosaicOptions?.seed === "number" && Number.isFinite(mosaicOptions.seed)
      ? mosaicOptions.seed
      : runSeed;
  const tiles = useMemo(
    () => createTiles(columns, rows, rotation, seed, colors.length),
    [colors.length, columns, rotation, rows, seed],
  );
  const delays = useMemo(
    () => tileDelays(tiles, origin, clickPosition, viewport, stagger),
    [clickPosition, origin, stagger, tiles, viewport],
  );
  const tileRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const animationsRef = useRef<Animation[]>([]);

  const reset = useCallback(() => {
    stopAnimations(animationsRef.current);
    tileRefs.current.forEach((tile, index) => {
      setVisualState([tile], {
        opacity: 0,
        transform: hiddenTransform(tiles[index]?.rotation ?? 0),
        transformOrigin: "center",
      });
    });
  }, [tiles]);

  const cover = useCallback(async () => {
    reset();
    const animations = tileRefs.current.map((tile, index) => {
      if (!tile) {
        return null;
      }

      return startAnimation(
        tile,
        [
          {
            opacity: 0,
            transform: hiddenTransform(tiles[index]?.rotation ?? 0),
          },
          { opacity: 1, transform: VISIBLE_TRANSFORM },
        ],
        {
          duration,
          delay: delays[index] ?? 0,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        },
      );
    });

    await finishAnimations(animations, animationsRef.current);
  }, [delays, duration, reset, tiles]);

  const reveal = useCallback(async () => {
    setVisualState(tileRefs.current, {
      opacity: 1,
      transform: VISIBLE_TRANSFORM,
      transformOrigin: "center",
    });
    stopAnimations(animationsRef.current);

    const animations = tileRefs.current.map((tile, index) => {
      if (!tile) {
        return null;
      }

      return startAnimation(
        tile,
        [
          { opacity: 1, transform: VISIBLE_TRANSFORM },
          {
            opacity: 0,
            transform: hiddenTransform(-(tiles[index]?.rotation ?? 0)),
          },
        ],
        {
          duration,
          delay: stagger - (delays[index] ?? 0),
          easing: "cubic-bezier(0.64, 0, 0.78, 0)",
          fill: "forwards",
        },
      );
    });

    await finishAnimations(animations, animationsRef.current);
  }, [delays, duration, stagger, tiles]);

  useImperativeHandle<OverlayAnimationHandle, OverlayAnimationHandle>(
    controllerRef,
    () => ({ cover, reveal, reset }),
    [cover, reset, reveal],
  );
  useEffect(() => reset, [reset]);

  return (
    <div
      aria-hidden="true"
      data-routeveil-mosaic=""
      style={overlayFillStyle}
    >
      {tiles.map((tile, index) => (
        <span
          data-routeveil-mosaic-tile=""
          key={tile.id}
          ref={(element) => {
            tileRefs.current[index] = element;
          }}
          style={{
            position: "absolute",
            ...tilePosition(tile),
            backgroundColor: colors[tile.colorIndex] ?? DEFAULT_COLORS[0],
            opacity: 0,
            transform: hiddenTransform(tile.rotation),
            transformOrigin: "center",
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}
