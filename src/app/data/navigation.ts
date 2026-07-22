export const primaryNavigation = [
  { label: 'Home', path: '/' },
  { label: 'Docs', path: '/docs' },
  { label: 'Lab', path: '/lab' },
] as const

export type PrimaryPath = (typeof primaryNavigation)[number]['path']

export function resolvePrimaryPath(pathname: string): PrimaryPath {
  if (pathname === '/docs' || pathname.startsWith('/docs/')) return '/docs'
  if (pathname === '/lab' || pathname.startsWith('/lab/')) return '/lab'
  return '/'
}

export function routeDirection(
  currentPathname: string,
  targetPathname: string,
): 'left' | 'right' {
  const current = resolvePrimaryPath(currentPathname)
  const target = resolvePrimaryPath(targetPathname)
  const currentIndex = primaryNavigation.findIndex((item) => item.path === current)
  const targetIndex = primaryNavigation.findIndex((item) => item.path === target)

  return targetIndex >= currentIndex ? 'left' : 'right'
}
