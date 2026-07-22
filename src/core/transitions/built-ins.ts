import {
  ColumnsOverlay,
  ClockOverlay,
  CurtainOverlay,
  DissolveOverlay,
  HaloOverlay,
  IrisOverlay,
  MosaicOverlay,
  PixelOverlay,
  RowsOverlay,
  TunnelOverlay,
  VenetianOverlay,
  WipeOverlay,
} from "../overlays/index.js";
import type {
  ClockOverlayOptions,
  ColumnsOverlayOptions,
  CurtainOverlayOptions,
  DissolveOverlayOptions,
  HaloOverlayOptions,
  IrisOverlayOptions,
  MosaicOverlayOptions,
  PixelOverlayOptions,
  RowsOverlayOptions,
  TunnelOverlayOptions,
  VenetianOverlayOptions,
  WipeOverlayOptions,
} from "../overlays/index.js";
import {
  bounce,
  blur,
  fade,
  pull,
  push,
  rotate,
  slide,
  spin,
} from "./page.js";
import type {
  BuiltInTransitionName,
  OverlayTransitionDefinition,
  PageTransitionDefinition,
} from "./types.js";

export const pixel = {
  type: "overlay",
  renderer: PixelOverlay,
} satisfies OverlayTransitionDefinition<PixelOverlayOptions>;

export const curtain = {
  type: "overlay",
  renderer: CurtainOverlay,
} satisfies OverlayTransitionDefinition<CurtainOverlayOptions>;

export const wipe = {
  type: "overlay",
  renderer: WipeOverlay,
} satisfies OverlayTransitionDefinition<WipeOverlayOptions>;

export const columns = {
  type: "overlay",
  renderer: ColumnsOverlay,
} satisfies OverlayTransitionDefinition<ColumnsOverlayOptions>;

export const rows = {
  type: "overlay",
  renderer: RowsOverlay,
} satisfies OverlayTransitionDefinition<RowsOverlayOptions>;

export const iris = {
  type: "overlay",
  renderer: IrisOverlay,
} satisfies OverlayTransitionDefinition<IrisOverlayOptions>;

export const halo = {
  type: "overlay",
  renderer: HaloOverlay,
} satisfies OverlayTransitionDefinition<HaloOverlayOptions>;

export const tunnel = {
  type: "overlay",
  renderer: TunnelOverlay,
} satisfies OverlayTransitionDefinition<TunnelOverlayOptions>;

export const clock = {
  type: "overlay",
  renderer: ClockOverlay,
} satisfies OverlayTransitionDefinition<ClockOverlayOptions>;

export const venetian = {
  type: "overlay",
  renderer: VenetianOverlay,
} satisfies OverlayTransitionDefinition<VenetianOverlayOptions>;

export const mosaic = {
  type: "overlay",
  renderer: MosaicOverlay,
} satisfies OverlayTransitionDefinition<MosaicOverlayOptions>;

export const dissolve = {
  type: "overlay",
  renderer: DissolveOverlay,
} satisfies OverlayTransitionDefinition<DissolveOverlayOptions>;

export type BuiltInTransitionMap = Readonly<{
  fade: PageTransitionDefinition;
  blur: PageTransitionDefinition;
  slide: PageTransitionDefinition;
  spin: PageTransitionDefinition;
  rotate: PageTransitionDefinition;
  bounce: PageTransitionDefinition;
  push: PageTransitionDefinition;
  pull: PageTransitionDefinition;
  pixel: OverlayTransitionDefinition<PixelOverlayOptions>;
  curtain: OverlayTransitionDefinition<CurtainOverlayOptions>;
  wipe: OverlayTransitionDefinition<WipeOverlayOptions>;
  columns: OverlayTransitionDefinition<ColumnsOverlayOptions>;
  rows: OverlayTransitionDefinition<RowsOverlayOptions>;
  iris: OverlayTransitionDefinition<IrisOverlayOptions>;
  halo: OverlayTransitionDefinition<HaloOverlayOptions>;
  tunnel: OverlayTransitionDefinition<TunnelOverlayOptions>;
  clock: OverlayTransitionDefinition<ClockOverlayOptions>;
  venetian: OverlayTransitionDefinition<VenetianOverlayOptions>;
  mosaic: OverlayTransitionDefinition<MosaicOverlayOptions>;
  dissolve: OverlayTransitionDefinition<DissolveOverlayOptions>;
}>;

export const builtInTransitions = {
  fade,
  blur,
  slide,
  spin,
  rotate,
  bounce,
  push,
  pull,
  pixel,
  curtain,
  wipe,
  columns,
  rows,
  iris,
  halo,
  tunnel,
  clock,
  venetian,
  mosaic,
  dissolve,
} satisfies BuiltInTransitionMap & Record<BuiltInTransitionName, unknown>;

export type BuiltInTransitionDefinition =
  (typeof builtInTransitions)[BuiltInTransitionName];
