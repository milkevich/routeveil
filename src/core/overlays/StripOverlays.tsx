import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import type { CSSProperties, Ref } from "react";
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
  safeEasing,
  setVisualState,
  startAnimation,
  stopAnimations,
} from "./shared.js";

export type StripOrder = "forward" | "reverse" | "center";
export type ColumnDirection = "down" | "up" | "alternate";
export type RowDirection = "right" | "left" | "alternate";

type SharedStripOptions = Readonly<{
  count?: number;
  color?: string;
  duration?: number;
  stagger?: number;
  easing?: string;
  order?: StripOrder;
}>;

export type ColumnsOverlayOptions = SharedStripOptions &
  Readonly<{
    columns?: number;
    direction?: ColumnDirection;
  }>;

export type RowsOverlayOptions = SharedStripOptions &
  Readonly<{
    rows?: number;
    direction?: RowDirection;
  }>;

const STRIP_ORDERS = ["forward", "reverse", "center"] as const satisfies readonly StripOrder[];
const COLUMN_DIRECTIONS = ["down", "up", "alternate"] as const satisfies readonly ColumnDirection[];
const ROW_DIRECTIONS = ["right", "left", "alternate"] as const satisfies readonly RowDirection[];

type StripOverlayProps = Readonly<{
  orientation: "columns" | "rows";
  count: number;
  color: string;
  duration: number;
  stagger: number;
  easing: string;
  order: StripOrder;
  direction: "start" | "end" | "alternate";
  controllerRef: Ref<OverlayAnimationHandle>;
}>;

function delayForIndex(
  index: number,
  count: number,
  order: StripOrder,
  stagger: number,
): number {
  if (count <= 1 || stagger === 0) {
    return 0;
  }

  if (order === "reverse") {
    return ((count - index - 1) / (count - 1)) * stagger;
  }

  if (order === "center") {
    const center = (count - 1) / 2;
    const maximumDistance = Math.max(center, count - 1 - center);
    return (Math.abs(index - center) / maximumDistance) * stagger;
  }

  return (index / (count - 1)) * stagger;
}

function transformOrigin(
  orientation: "columns" | "rows",
  direction: "start" | "end" | "alternate",
  index: number,
  reveal: boolean,
): string {
  let startsAtBeginning =
    direction === "start" || (direction === "alternate" && index % 2 === 0);
  if (reveal) {
    startsAtBeginning = !startsAtBeginning;
  }

  if (orientation === "columns") {
    return startsAtBeginning ? "center top" : "center bottom";
  }
  return startsAtBeginning ? "left center" : "right center";
}

function StripOverlay({
  orientation,
  count,
  color,
  duration,
  stagger,
  easing,
  order,
  direction,
  controllerRef,
}: StripOverlayProps) {
  const stripRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const animationsRef = useRef<Animation[]>([]);
  const indices = useMemo(
    () => Array.from({ length: count }, (_, index) => index),
    [count],
  );
  const hiddenTransform = orientation === "columns" ? "scaleY(0)" : "scaleX(0)";
  const visibleTransform = orientation === "columns" ? "scaleY(1.02)" : "scaleX(1.02)";

  const reset = useCallback(() => {
    stopAnimations(animationsRef.current);
    stripRefs.current.forEach((strip, index) => {
      setVisualState([strip], {
        opacity: 1,
        transform: hiddenTransform,
        transformOrigin: transformOrigin(orientation, direction, index, false),
      });
    });
  }, [direction, hiddenTransform, orientation]);

  const cover = useCallback(async () => {
    reset();
    const animations = stripRefs.current.map((strip, index) =>
      strip
        ? startAnimation(
            strip,
            [
              { transform: hiddenTransform },
              { transform: visibleTransform },
            ],
            {
              duration,
              delay: delayForIndex(index, count, order, stagger),
              easing,
              fill: "forwards",
            },
          )
        : null,
    );
    await finishAnimations(animations, animationsRef.current);
  }, [count, duration, easing, hiddenTransform, order, reset, stagger, visibleTransform]);

  const reveal = useCallback(async () => {
    stripRefs.current.forEach((strip, index) => {
      setVisualState([strip], {
        opacity: 1,
        transform: visibleTransform,
        transformOrigin: transformOrigin(orientation, direction, index, true),
      });
    });
    stopAnimations(animationsRef.current);
    const animations = stripRefs.current.map((strip, index) =>
      strip
        ? startAnimation(
            strip,
            [
              { transform: visibleTransform },
              { transform: hiddenTransform },
            ],
            {
              duration,
              delay: delayForIndex(index, count, order, stagger),
              easing,
              fill: "forwards",
            },
          )
        : null,
    );
    await finishAnimations(animations, animationsRef.current);
  }, [
    count,
    direction,
    duration,
    easing,
    hiddenTransform,
    order,
    orientation,
    stagger,
    visibleTransform,
  ]);

  useImperativeHandle<OverlayAnimationHandle, OverlayAnimationHandle>(
    controllerRef,
    () => ({ cover, reveal, reset }),
    [cover, reset, reveal],
  );
  useEffect(() => reset, [reset]);

  const gridStyle: CSSProperties =
    orientation === "columns"
      ? {
          gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
          gridTemplateRows: "1fr",
        }
      : {
          gridTemplateColumns: "1fr",
          gridTemplateRows: `repeat(${count}, minmax(0, 1fr))`,
        };

  return (
    <div
      aria-hidden="true"
      data-routeveil-columns={orientation === "columns" ? "" : undefined}
      data-routeveil-rows={orientation === "rows" ? "" : undefined}
      style={{ ...overlayFillStyle, display: "grid", ...gridStyle }}
    >
      {indices.map((index) => (
        <span
          data-routeveil-column={orientation === "columns" ? "" : undefined}
          data-routeveil-row={orientation === "rows" ? "" : undefined}
          key={index}
          ref={(element) => {
            stripRefs.current[index] = element;
          }}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            backgroundColor: color,
            boxShadow: `0 0 0 1px ${color}`,
            transform: hiddenTransform,
            transformOrigin: transformOrigin(orientation, direction, index, false),
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}

export function ColumnsOverlay({
  options,
  controllerRef,
}: OverlayRendererProps<ColumnsOverlayOptions>) {
  const columnOptions = options;
  const count = finiteInteger(
    columnOptions?.columns ?? columnOptions?.count,
    10,
    1,
    48,
  );
  const direction = choiceValue(
    columnOptions?.direction,
    COLUMN_DIRECTIONS,
    "alternate",
  );
  const order = choiceValue(columnOptions?.order, STRIP_ORDERS, "forward");

  return (
    <StripOverlay
      color={colorValue(columnOptions?.color, "#0a0a0a")}
      controllerRef={controllerRef}
      count={count}
      direction={
        direction === "alternate" ? "alternate" : direction === "down" ? "start" : "end"
      }
      duration={finiteNumber(columnOptions?.duration, 460, 1, 3_000)}
      easing={safeEasing(
        columnOptions?.easing,
        "cubic-bezier(0.65, 0, 0.35, 1)",
      )}
      order={order}
      orientation="columns"
      stagger={finiteNumber(columnOptions?.stagger, 280, 0, 3_000)}
    />
  );
}

export function RowsOverlay({
  options,
  controllerRef,
}: OverlayRendererProps<RowsOverlayOptions>) {
  const rowOptions = options;
  const count = finiteInteger(
    rowOptions?.rows ?? rowOptions?.count,
    8,
    1,
    48,
  );
  const direction = choiceValue(
    rowOptions?.direction,
    ROW_DIRECTIONS,
    "alternate",
  );
  const order = choiceValue(rowOptions?.order, STRIP_ORDERS, "forward");

  return (
    <StripOverlay
      color={colorValue(rowOptions?.color, "#0a0a0a")}
      controllerRef={controllerRef}
      count={count}
      direction={
        direction === "alternate" ? "alternate" : direction === "right" ? "start" : "end"
      }
      duration={finiteNumber(rowOptions?.duration, 460, 1, 3_000)}
      easing={safeEasing(
        rowOptions?.easing,
        "cubic-bezier(0.65, 0, 0.35, 1)",
      )}
      order={order}
      orientation="rows"
      stagger={finiteNumber(rowOptions?.stagger, 240, 0, 3_000)}
    />
  );
}
