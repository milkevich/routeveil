import type { ClickPosition } from "../transitions/types.js";

export type RadialOrigin = "cursor" | "center";

export type ViewportSize = Readonly<{
  width: number;
  height: number;
}>;

export type RadialGeometry = Readonly<{
  x: number;
  y: number;
  radius: number;
}>;

export function readViewportSize(): ViewportSize {
  if (typeof window === "undefined") {
    return { width: 0, height: 0 };
  }

  return {
    width: Math.max(0, window.innerWidth),
    height: Math.max(0, window.innerHeight),
  };
}

function finiteCoordinate(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function radialGeometry(
  viewport: ViewportSize,
  origin: RadialOrigin,
  clickPosition: ClickPosition | undefined,
  padding = 0,
): RadialGeometry {
  const width = Math.max(0, viewport.width);
  const height = Math.max(0, viewport.height);
  const useCursor =
    origin === "cursor" &&
    finiteCoordinate(clickPosition?.x) &&
    finiteCoordinate(clickPosition?.y);
  const x = useCursor
    ? Math.min(width, Math.max(0, clickPosition.x))
    : width / 2;
  const y = useCursor
    ? Math.min(height, Math.max(0, clickPosition.y))
    : height / 2;
  const horizontalDistance = Math.max(x, width - x);
  const verticalDistance = Math.max(y, height - y);

  return {
    x,
    y,
    radius:
      Math.hypot(horizontalDistance, verticalDistance) + Math.max(0, padding),
  };
}

export function safeRadialOrigin(value: unknown): RadialOrigin {
  return value === "center" ? "center" : "cursor";
}

export function svgIdentifier(prefix: string, reactId: string): string {
  return `${prefix}-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
