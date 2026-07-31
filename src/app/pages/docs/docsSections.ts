export const docsSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'installation', label: 'Installation' },
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'compatibility', label: 'Compatibility' },
  { id: 'provider', label: 'Provider' },
  { id: 'routeveil-link', label: 'RouteveilLink' },
  { id: 'route-preloading', label: 'Route Preloading' },
  { id: 'routeveil-view', label: 'RouteveilView' },
  { id: 'programmatic-navigation', label: 'Programmatic Navigation' },
  { id: 'transition-playback', label: 'Transition Playback' },
  { id: 'route-readiness', label: 'Route Readiness' },
  { id: 'interrupted-navigation', label: 'Interrupted Navigation' },
  { id: 'page-transitions', label: 'Page Transitions' },
  { id: 'shared-elements', label: 'Shared Elements' },
  { id: 'overlay-transitions', label: 'Overlay Transitions' },
  { id: 'configuring-transitions', label: 'Configuring Transitions' },
  { id: 'reduced-motion', label: 'Reduced Motion' },
] as const

export type DocsSectionId = (typeof docsSections)[number]['id']
