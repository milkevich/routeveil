import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type {
  OverlayAnimationHandle,
  OverlayRendererProps,
} from "../transitions/types.js";
import { HaloOverlay } from "./HaloOverlay.js";
import { IrisOverlay } from "./IrisOverlay.js";
import type { IrisOverlayOptions } from "./IrisOverlay.js";
import {
  finiteNumber,
  overlayFillStyle,
  setVisualState,
} from "./shared.js";

export type TunnelOverlayOptions = IrisOverlayOptions & Readonly<{
  coverDuration?: number;
  revealDuration?: number;
}>;

const DEFAULT_DURATION = 640;
const MINIMUM_DURATION = 1;
const MAXIMUM_DURATION = 3_000;

export function TunnelOverlay({
  options,
  clickPosition,
  controllerRef,
}: OverlayRendererProps<TunnelOverlayOptions>) {
  const tunnelOptions = options;
  const duration = finiteNumber(
    tunnelOptions?.duration,
    DEFAULT_DURATION,
    MINIMUM_DURATION,
    MAXIMUM_DURATION,
  );
  const coverDuration = finiteNumber(
    tunnelOptions?.coverDuration,
    duration,
    MINIMUM_DURATION,
    MAXIMUM_DURATION,
  );
  const revealDuration = finiteNumber(
    tunnelOptions?.revealDuration,
    duration,
    MINIMUM_DURATION,
    MAXIMUM_DURATION,
  );
  const coverLayerRef = useRef<HTMLDivElement | null>(null);
  const revealLayerRef = useRef<HTMLDivElement | null>(null);
  const haloControllerRef = useRef<OverlayAnimationHandle | null>(null);
  const irisControllerRef = useRef<OverlayAnimationHandle | null>(null);

  const coverOptions: IrisOverlayOptions = {
    color: tunnelOptions?.color,
    origin: tunnelOptions?.origin,
    duration: coverDuration,
    easing: tunnelOptions?.easing,
  };
  const revealOptions: IrisOverlayOptions = {
    color: tunnelOptions?.color,
    origin: tunnelOptions?.origin,
    duration: revealDuration,
    easing: tunnelOptions?.easing,
  };

  const reset = useCallback(() => {
    haloControllerRef.current?.reset();
    irisControllerRef.current?.reset();
    setVisualState([coverLayerRef.current], { opacity: 1 });
    setVisualState([revealLayerRef.current], { opacity: 0 });
  }, []);

  const cover = useCallback(async () => {
    reset();
    await haloControllerRef.current?.cover();
  }, [reset]);

  const reveal = useCallback(async () => {
    const revealPromise = irisControllerRef.current?.reveal();

    setVisualState([revealLayerRef.current], { opacity: 1 });
    setVisualState([coverLayerRef.current], { opacity: 0 });

    await revealPromise;
  }, []);

  useImperativeHandle<OverlayAnimationHandle, OverlayAnimationHandle>(
    controllerRef,
    () => ({ cover, reveal, reset }),
    [cover, reset, reveal],
  );
  useEffect(() => reset, [reset]);

  return (
    <div
      aria-hidden="true"
      data-routeveil-tunnel=""
      style={overlayFillStyle}
    >
      <div
        data-routeveil-tunnel-cover=""
        ref={coverLayerRef}
        style={{ ...overlayFillStyle, opacity: 1 }}
      >
        <HaloOverlay
          clickPosition={clickPosition}
          controllerRef={haloControllerRef}
          options={coverOptions}
        />
      </div>
      <div
        data-routeveil-tunnel-reveal=""
        ref={revealLayerRef}
        style={{ ...overlayFillStyle, opacity: 0 }}
      >
        <IrisOverlay
          clickPosition={clickPosition}
          controllerRef={irisControllerRef}
          options={revealOptions}
        />
      </div>
    </div>
  );
}
