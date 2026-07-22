const issuedWarnings = new Set<string>()

declare const process:
  | {
      env?: {
        NODE_ENV?: string
      }
    }
  | undefined

export function isRouteveilDevelopment(): boolean {
  const override = (
    globalThis as typeof globalThis & { __ROUTEVEIL_DEV__?: boolean }
  ).__ROUTEVEIL_DEV__

  if (typeof override === 'boolean') {
    return override
  }

  if (typeof process !== 'undefined') {
    return process.env?.NODE_ENV !== 'production'
  }

  if (typeof location !== 'undefined') {
    return (
      location.hostname === 'localhost'
      || location.hostname === '127.0.0.1'
      || location.hostname === '::1'
      || location.hostname.endsWith('.localhost')
    )
  }

  return false
}

export function warnOnce(key: string, message: string): void {
  if (!isRouteveilDevelopment() || issuedWarnings.has(key)) {
    return
  }

  issuedWarnings.add(key)
  console.warn(message)
}
