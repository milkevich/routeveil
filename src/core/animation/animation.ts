import type { AnimationPhaseDefinition } from "../transitions/types.js";

export async function safelyWaitForAnimation(
  animation: Animation,
): Promise<void> {
  try {
    await animation.finished;
  } catch {
    return;
  }
}

export async function safelyWaitForAnimations(
  animations: readonly Animation[],
): Promise<void> {
  await Promise.all(animations.map(safelyWaitForAnimation));
}

export function cancelAnimation(animation: Animation | null | undefined): void {
  if (!animation) {
    return;
  }

  try {
    animation.cancel();
  } catch {
    return;
  }
}

export function cancelAnimations(animations: readonly Animation[]): void {
  for (const animation of animations) {
    cancelAnimation(animation);
  }
}

export async function animatePhase(
  element: HTMLElement,
  phase: AnimationPhaseDefinition,
): Promise<Animation | null> {
  if (typeof element.animate !== "function") {
    return null;
  }

  let animation: Animation;

  try {
    animation = element.animate(phase.keyframes, phase.options);
  } catch {
    return null;
  }

  await safelyWaitForAnimation(animation);
  return animation;
}

export function nextPaint(): Promise<void> {
  if (typeof requestAnimationFrame !== "function") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(fallback);
      resolve();
    };
    const fallback = window.setTimeout(finish, 120);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        finish();
      });
    });
  });
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
