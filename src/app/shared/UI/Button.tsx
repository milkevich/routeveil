import type { ButtonHTMLAttributes } from 'react'
import { RouteveilLink } from '../../../react-router'
import type { RouteveilLinkProps } from '../../../react-router'
import './Button.css'
import { buttonClassName } from './buttonStyles'
import type { ButtonVariant } from './buttonStyles'

export type { ButtonVariant } from './buttonStyles'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

export type ButtonLinkProps = RouteveilLinkProps & {
  variant?: ButtonVariant
}

export function Button({
  className,
  type = 'button',
  variant = 'filled',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={buttonClassName(variant, className)}
      type={type}
    />
  )
}

export function ButtonLink({
  className,
  variant = 'filled',
  ...props
}: ButtonLinkProps) {
  return (
    <RouteveilLink
      {...props}
      className={buttonClassName(variant, className)}
    />
  )
}
