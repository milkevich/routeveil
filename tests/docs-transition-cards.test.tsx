import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TransitionDocs } from '../src/app/pages/docs/content/TransitionDocs'
import { RouteveilProvider } from '../src/react-router'

const { playTransition } = vi.hoisted(() => ({
  playTransition: vi.fn(() => Promise.resolve()),
}))

vi.mock('../src/react-router/useRouteveilTransition', () => ({
  useRouteveilTransition: () => playTransition,
}))

beforeEach(() => {
  playTransition.mockClear()
})

describe('documentation transition cards', () => {
  it('plays each page and overlay transition with its preview options', async () => {
    render(
      <MemoryRouter>
        <RouteveilProvider>
          <TransitionDocs />
        </RouteveilProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', {
      name: 'Play slide transition',
    }))

    await waitFor(() => {
      expect(playTransition).toHaveBeenNthCalledWith(
        1,
        { name: 'slide', direction: 'left' },
        { clickPosition: { x: 0, y: 0 } },
      )
    })

    fireEvent.click(screen.getByRole('button', {
      name: 'Play halo transition',
    }))

    await waitFor(() => {
      expect(playTransition).toHaveBeenNthCalledWith(
        2,
        { name: 'halo', color: '#8433e1', origin: 'cursor' },
        { clickPosition: { x: 0, y: 0 } },
      )
    })
  })
})
