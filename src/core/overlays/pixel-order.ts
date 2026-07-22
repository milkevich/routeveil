import type { ClickPosition } from "../transitions/types.js";

export type PixelOrigin =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center"
  | "random"
  | "cursor";

export type PixelDelayOptions = Readonly<{
  columns: number;
  rows: number;
  origin: PixelOrigin;
  maximumDelay: number;
  randomSeed: number;
  clickPosition?: ClickPosition;
  viewportWidth?: number;
  viewportHeight?: number;
}>;

export type PixelGridGeometryOptions = Readonly<{
  columns: number;
  rows: number;
  viewportWidth: number;
  viewportHeight: number;
}>;

export type PixelGridGeometry = Readonly<{
  tileSize: number;
  gridWidth: number;
  gridHeight: number;
  offsetX: number;
  offsetY: number;
}>;

export function createPixelGridGeometry({
  columns,
  rows,
  viewportWidth,
  viewportHeight,
}: PixelGridGeometryOptions): PixelGridGeometry {
  if (
    !Number.isFinite(columns) ||
    columns <= 0 ||
    !Number.isFinite(rows) ||
    rows <= 0 ||
    !Number.isFinite(viewportWidth) ||
    viewportWidth < 0 ||
    !Number.isFinite(viewportHeight) ||
    viewportHeight < 0
  ) {
    return {
      tileSize: 0,
      gridWidth: 0,
      gridHeight: 0,
      offsetX: 0,
      offsetY: 0,
    };
  }

  const tileSize = Math.max(viewportWidth / columns, viewportHeight / rows);
  const gridWidth = tileSize * columns;
  const gridHeight = tileSize * rows;

  return {
    tileSize,
    gridWidth,
    gridHeight,
    offsetX: (viewportWidth - gridWidth) / 2,
    offsetY: (viewportHeight - gridHeight) / 2,
  };
}

function pseudoRandom(index: number, seed: number): number {
  const raw = Math.sin((index + 1) * 12.9898 + seed * 78.233) * 43_758.5453;
  return raw - Math.floor(raw);
}

function originPoint(
  origin: Exclude<PixelOrigin, "random">,
  columns: number,
  rows: number,
  clickPosition: ClickPosition | undefined,
  viewportWidth: number | undefined,
  viewportHeight: number | undefined,
): ClickPosition {
  const hasWidth =
    typeof viewportWidth === "number" &&
    Number.isFinite(viewportWidth) &&
    viewportWidth > 0;
  const hasHeight =
    typeof viewportHeight === "number" &&
    Number.isFinite(viewportHeight) &&
    viewportHeight > 0;
  const safeWidth = hasWidth
    ? viewportWidth
    : hasHeight
      ? (viewportHeight / rows) * columns
      : columns;
  const safeHeight = hasHeight
    ? viewportHeight
    : hasWidth
      ? (viewportWidth / columns) * rows
      : rows;
  const geometry = createPixelGridGeometry({
    columns,
    rows,
    viewportWidth: safeWidth,
    viewportHeight: safeHeight,
  });

  let viewportPoint: ClickPosition;
  switch (origin) {
    case "top-left":
      viewportPoint = { x: 0, y: 0 };
      break;
    case "top-right":
      viewportPoint = { x: safeWidth, y: 0 };
      break;
    case "bottom-left":
      viewportPoint = { x: 0, y: safeHeight };
      break;
    case "bottom-right":
      viewportPoint = { x: safeWidth, y: safeHeight };
      break;
    case "cursor":
      viewportPoint = clickPosition ?? {
        x: safeWidth / 2,
        y: safeHeight / 2,
      };
      break;
    case "center":
      viewportPoint = { x: safeWidth / 2, y: safeHeight / 2 };
      break;
  }

  if (geometry.tileSize === 0) {
    return { x: (columns - 1) / 2, y: (rows - 1) / 2 };
  }

  return {
    x: Math.min(
      columns - 1,
      Math.max(
        0,
        (viewportPoint.x - geometry.offsetX) / geometry.tileSize - 0.5,
      ),
    ),
    y: Math.min(
      rows - 1,
      Math.max(
        0,
        (viewportPoint.y - geometry.offsetY) / geometry.tileSize - 0.5,
      ),
    ),
  };
}

export function createPixelDelays(options: PixelDelayOptions): number[] {
  const {
    columns,
    rows,
    origin,
    maximumDelay,
    randomSeed,
    clickPosition,
    viewportWidth,
    viewportHeight,
  } = options;
  const count = columns * rows;

  if (count <= 0) {
    return [];
  }

  const point =
    origin === "random"
      ? null
      : originPoint(
          origin,
          columns,
          rows,
          clickPosition,
          viewportWidth,
          viewportHeight,
        );

  const priorities = Array.from({ length: count }, (_, index) => {
    if (!point) {
      return pseudoRandom(index, randomSeed);
    }

    const row = Math.floor(index / columns);
    const column = index % columns;
    return Math.hypot(column - point.x, row - point.y);
  });
  const lowest = Math.min(...priorities);
  const highest = Math.max(...priorities);
  const range = highest - lowest;

  if (range === 0) {
    return priorities.map(() => 0);
  }

  return priorities.map(
    (priority) => ((priority - lowest) / range) * maximumDelay,
  );
}
