export const docsSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'installation', label: 'Installation' },
  { id: 'compatibility', label: 'Compatibility' },
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'provider', label: 'Provider' },
  { id: 'routeveil-link', label: 'RouteveilLink' },
  { id: 'routeveil-view', label: 'RouteveilView' },
  { id: 'programmatic-navigation', label: 'Programmatic Navigation' },
  { id: 'interrupted-navigation', label: 'Interrupted Navigation' },
  { id: 'page-transitions', label: 'Page Transitions' },
  { id: 'overlay-transitions', label: 'Overlay Transitions' },
  { id: 'transition-options', label: 'Transition Options' },
  { id: 'reduced-motion', label: 'Reduced Motion' },
] as const

export type DocsSectionId = (typeof docsSections)[number]['id']
