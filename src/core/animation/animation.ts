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
  onAnimation?: (animation: Animation) => void,
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

  onAnimation?.(animation);
  await safelyWaitForAnimation(animation);
  return animation;
}

export function nextPaint(signal?: AbortSignal): Promise<void> {
  if (
    typeof window === "undefined"
    || typeof requestAnimationFrame !== "function"
  ) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let firstFrame = 0;
    let secondFrame = 0;
    let fallback = 0;

    const abort = () => {
      finish(new Error("Routeveil transition was cancelled."));
    };

    const cleanup = () => {
      window.clearTimeout(fallback);

      if (firstFrame) {
        cancelAnimationFrame(firstFrame);
      }

      if (secondFrame) {
        cancelAnimationFrame(secondFrame);
      }

      signal?.removeEventListener("abort", abort);
    };

    const finish = (error?: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();

      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    if (signal?.aborted) {
      abort();
      return;
    }

    signal?.addEventListener("abort", abort, { once: true });
    fallback = window.setTimeout(() => finish(), 120);

    firstFrame = requestAnimationFrame(() => {
      firstFrame = 0;
      secondFrame = requestAnimationFrame(() => {
        secondFrame = 0;
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
