export const primaryNavigation = [
  { label: 'Home', path: '/' },
  { label: 'Docs', path: '/docs' },
  { label: 'Releases', path: '/releases' },
  { label: 'Lab', path: '/lab' },
] as const

export type PrimaryPath = (typeof primaryNavigation)[number]['path']

export function resolvePrimaryPath(pathname: string): PrimaryPath {
  const normalizedPathname = pathname.split(/[?#]/u, 1)[0] ?? pathname

  if (
    normalizedPathname === '/docs'
    || normalizedPathname.startsWith('/docs/')
  ) return '/docs'
  if (
    normalizedPathname === '/releases'
    || normalizedPathname.startsWith('/releases/')
  ) return '/releases'
  if (
    normalizedPathname === '/lab'
    || normalizedPathname.startsWith('/lab/')
  ) return '/lab'
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
