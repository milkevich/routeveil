import type { CSSProperties } from "react";
import {
  cancelAnimations,
  safelyWaitForAnimations,
} from "../animation/animation.js";

type StyleElement = HTMLElement | SVGElement;

export const overlayFillStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  overflow: "hidden",
  pointerEvents: "none",
  userSelect: "none",
};

export function finiteNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, value));
}

export function finiteInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  return Math.round(finiteNumber(value, fallback, minimum, maximum));
}

export function colorValue(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  const color = value.trim();
  if (color.toLowerCase() === "transparent") {
    return fallback;
  }

  const hex = color.match(/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i);
  if (hex && (color.length === 5 || color.length === 9)) {
    const alpha = color.length === 5
      ? Number.parseInt(color.at(-1)!.repeat(2), 16)
      : Number.parseInt(color.slice(-2), 16);
    if (alpha < 255) {
      return fallback;
    }
  }

  const slashAlpha = color.match(/\/\s*([\d.]+)(%)?\s*\)$/);
  if (slashAlpha) {
    const alpha = Number(slashAlpha[1]);
    const opaque = slashAlpha[2] ? alpha >= 100 : alpha >= 1;
    if (!Number.isFinite(alpha) || !opaque) {
      return fallback;
    }
  }

  const legacyAlpha = color.match(/^(?:rgba|hsla)\([^)]*,\s*([\d.]+)(%)?\s*\)$/i);
  if (legacyAlpha) {
    const alpha = Number(legacyAlpha[1]);
    const opaque = legacyAlpha[2] ? alpha >= 100 : alpha >= 1;
    if (!Number.isFinite(alpha) || !opaque) {
      return fallback;
    }
  }

  if (typeof document !== "undefined") {
    const style = document.createElement("span").style;
    style.color = color;
    if (!style.color) {
      return fallback;
    }
  }

  return color;
}

export function choiceValue<const TValues extends readonly string[]>(
  value: unknown,
  values: TValues,
  fallback: TValues[number],
): TValues[number] {
  if (typeof value !== "string") {
    return fallback;
  }

  return values.find((option) => option === value) ?? fallback;
}

export function safeEasing(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  const easing = value.trim();
  if (typeof document === "undefined") {
    return easing;
  }

  const style = document.createElement("span").style;
  style.animationTimingFunction = easing;
  return style.animationTimingFunction ? easing : fallback;
}

function cssPropertyName(property: string): string {
  return property.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function applyKeyframe(element: StyleElement, keyframe: Keyframe): void {
  for (const [property, value] of Object.entries(keyframe)) {
    if (
      property === "offset" ||
      property === "easing" ||
      property === "composite" ||
      value === undefined ||
      value === null ||
      Array.isArray(value)
    ) {
      continue;
    }

    element.style.setProperty(cssPropertyName(property), String(value));
  }
}

function applyFinalKeyframe(
  element: StyleElement,
  keyframes: Keyframe[],
): null {
  const finalKeyframe = keyframes.at(-1);
  if (finalKeyframe) {
    applyKeyframe(element, finalKeyframe);
  }

  return null;
}

export function startAnimation(
  element: StyleElement,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation | null {
  if (typeof element.animate === "function") {
    try {
      return element.animate(keyframes, options);
    } catch {
      return applyFinalKeyframe(element, keyframes);
    }
  }

  return applyFinalKeyframe(element, keyframes);
}

export async function finishAnimations(
  animations: Array<Animation | null>,
  activeAnimations: Animation[],
): Promise<void> {
  const startedAnimations = animations.filter(
    (animation): animation is Animation => animation !== null,
  );
  activeAnimations.push(...startedAnimations);
  await safelyWaitForAnimations(startedAnimations);
}

export function stopAnimations(animations: Animation[]): void {
  cancelAnimations(animations);
  animations.length = 0;
}

export function setVisualState(
  elements: readonly (StyleElement | null)[],
  state: Readonly<Partial<Pick<CSSProperties, "opacity" | "transform" | "transformOrigin">>>,
): void {
  for (const element of elements) {
    if (!element) {
      continue;
    }

    if (state.opacity !== undefined) {
      element.style.opacity = String(state.opacity);
    }
    if (state.transform !== undefined) {
      element.style.transform = String(state.transform);
    }
    if (state.transformOrigin !== undefined) {
      element.style.transformOrigin = String(state.transformOrigin);
    }
  }
}
