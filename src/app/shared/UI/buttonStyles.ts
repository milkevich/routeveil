export type ButtonVariant = 'filled' | 'outlined'

export function buttonClassName(
  variant: ButtonVariant = 'filled',
  className?: string,
): string {
  return ['button', `button--${variant}`, className].filter(Boolean).join(' ')
}
