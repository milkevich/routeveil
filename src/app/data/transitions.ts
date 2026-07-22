import { builtInTransitions } from '../../core'
import type { BuiltInTransitionName } from '../../core'

export type TransitionCategory = 'page' | 'overlay'

export type TransitionMeta = Readonly<{
  name: BuiltInTransitionName
  category: TransitionCategory
  description: string
  behavior: string
  options: string
  previewOptions?: unknown
}>

const transitionCopy = {
  fade: {
    description: 'A quiet opacity crossfade between route states.',
    behavior: 'Opacity leaves, the route commits, and the next view fades in.',
    options: 'No transition-specific options.',
  },
  blur: {
    description: 'The complete route softens and disappears.',
    behavior: 'Blur increases while opacity moves from one to zero.',
    options: 'No transition-specific options.',
  },
  slide: {
    description: 'A directional editorial shift between pages.',
    behavior: 'The old route exits toward the selected edge and the next enters opposite it.',
    options: 'direction: up | down | left | right',
    previewOptions: { direction: 'left' },
  },
  spin: {
    description: 'A dimensional wheel-like route movement.',
    behavior: 'Perspective rotation and translation create a scrolling-wheel gesture.',
    options: 'direction: up | down | left | right',
    previewOptions: { direction: 'right' },
  },
  rotate: {
    description: 'A restrained two-dimensional turn.',
    behavior: 'The route shifts forty percent and rotates eighteen degrees at its furthest point.',
    options: 'direction: left | right',
    previewOptions: { direction: 'left' },
  },
  bounce: {
    description: 'A soft depth change with cinematic timing.',
    behavior: 'The route recedes gently before the incoming view settles.',
    options: 'No transition-specific options.',
  },
  push: {
    description: 'The current page advances toward the viewer.',
    behavior: 'The outgoing route grows while the incoming route follows from behind.',
    options: 'No transition-specific options.',
  },
  pull: {
    description: 'The next page is drawn forward into place.',
    behavior: 'The outgoing route recedes while a larger incoming view settles.',
    options: 'No transition-specific options.',
  },
  pixel: {
    description: 'A square tile field radiates from an origin.',
    behavior: 'Responsive square pixels cover the viewport before the route changes.',
    options: 'columns, rows, color, origin, duration, stagger',
    previewOptions: { color: '#8433e1', origin: 'cursor', columns: 18, rows: 12 },
  },
  curtain: {
    description: 'Two opposing panels close and reopen.',
    behavior: 'Paired panels meet at the center before revealing the next route.',
    options: 'color, axis, duration, easing',
    previewOptions: { color: '#101010', axis: 'horizontal' },
  },
  wipe: {
    description: 'One solid panel crosses the viewport.',
    behavior: 'A full-screen edge travels through cover and reveal.',
    options: 'color, direction, duration, easing',
    previewOptions: { color: '#d6ff43', direction: 'right' },
  },
  columns: {
    description: 'Vertical strips close in a controlled sequence.',
    behavior: 'Flat columns scale shut, commit the route, then open.',
    options: 'columns, count, direction, order, color, duration, stagger, easing',
    previewOptions: { color: '#ff6b46', count: 12, direction: 'alternate' },
  },
  rows: {
    description: 'Horizontal strips create a measured sweep.',
    behavior: 'Flat rows scale across the viewport in sequence.',
    options: 'rows, count, direction, order, color, duration, stagger, easing',
    previewOptions: { color: '#8433e1', count: 10, direction: 'alternate' },
  },
  iris: {
    description: 'A circular aperture closes around an origin.',
    behavior: 'The transparent opening contracts to cover and expands to reveal.',
    options: 'color, origin, duration, easing',
    previewOptions: { color: '#000000', origin: 'cursor' },
  },
  halo: {
    description: 'A solid circle grows from the selected origin.',
    behavior: 'The circle expands beyond every corner, then contracts after navigation.',
    options: 'color, origin, duration, easing',
    previewOptions: { color: '#8433e1', origin: 'cursor' },
  },
  tunnel: {
    description: 'A halo cover flows into an iris reveal.',
    behavior: 'Enter through a growing solid circle and exit through an expanding opening.',
    options: 'color, origin, duration, coverDuration, revealDuration, easing',
    previewOptions: { color: '#ff6b46', origin: 'cursor' },
  },
  clock: {
    description: 'A radial sector sweeps around the viewport.',
    behavior: 'The sweep begins at the cursor or center and rotates through a full cover.',
    options: 'color, origin, direction, startAngle, duration, easing',
    previewOptions: { color: '#000000', origin: 'center', direction: 'clockwise' },
  },
  venetian: {
    description: 'Dimensional blinds rotate shut and open.',
    behavior: 'Perspective strips hinge toward the viewer instead of scaling flat.',
    options: 'color, direction, count, alternate, duration, stagger',
    previewOptions: { color: '#8433e1', direction: 'horizontal', count: 12, alternate: true },
  },
  mosaic: {
    description: 'Seeded irregular pieces lock into a solid field.',
    behavior: 'Stable rectangles grow and rotate into a gap-free cover.',
    options: 'colors, columns, rows, duration, stagger, rotation, seed, origin',
    previewOptions: { colors: ['#000000', '#1a1a1a', '#333333'], origin: 'cursor', seed: 19 },
  },
  dissolve: {
    description: 'Procedural film grain resolves into solid black.',
    behavior: 'A stable canvas noise field covers and clears without thousands of nodes.',
    options: 'color, duration, grainSize, softness, seed',
    previewOptions: { color: '#000000', grainSize: 10, softness: 0.1, seed: 33 },
  },
} satisfies Record<
  BuiltInTransitionName,
  Omit<TransitionMeta, 'name' | 'category'>
>

export const transitionCatalog = (
  Object.keys(builtInTransitions) as BuiltInTransitionName[]
).map((name): TransitionMeta => ({
  name,
  category: builtInTransitions[name].type,
  ...transitionCopy[name],
}))

export const pageTransitions = transitionCatalog.filter(
  (transition) => transition.category === 'page',
)

export const overlayTransitions = transitionCatalog.filter(
  (transition) => transition.category === 'overlay',
)

export const featuredTransitionNames = [
  'iris',
  'tunnel',
  'clock',
  'dissolve',
  'slide',
  'rotate',
] as const satisfies readonly BuiltInTransitionName[]

export const featuredTransitions = featuredTransitionNames.map(
  (name) => transitionCatalog.find((transition) => transition.name === name)!,
)
