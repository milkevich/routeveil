import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('server import safety', () => {
  it('imports and renders static markup without browser globals', () => {
    const program = `
      import React from 'react'
      import { renderToString } from 'react-dom/server'
      import { MemoryRouter } from 'react-router-dom'
      const absent = ['window', 'document', 'Element', 'Animation', 'matchMedia']
      for (const name of absent) {
        if (typeof globalThis[name] !== 'undefined') {
          throw new Error(name + ' unexpectedly exists')
        }
      }
      globalThis.React = React
      const api = await import('./src/react-router/index.ts')
      const html = renderToString(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(
            api.RouteveilProvider,
            null,
            React.createElement('header', null, 'Persistent header'),
            React.createElement(
              api.RouteveilView,
              null,
              React.createElement('main', null, 'Static route'),
            ),
          ),
        ),
      )
      process.stdout.write(JSON.stringify({
        exports: Object.keys(api).sort(),
        html,
      }))
    `
    const output = execFileSync(
      process.execPath,
      ['--import', 'tsx', '--input-type=module', '--eval', program],
      {
        cwd: resolve(process.cwd()),
        encoding: 'utf8',
      },
    )
    const result = JSON.parse(output) as {
      exports: string[]
      html: string
    }

    expect(result.exports).toEqual([
      'RouteveilLink',
      'RouteveilProvider',
      'RouteveilView',
      'useRouteveilNavigate',
      'useRouteveilTransition',
    ])
    expect(result.html).toContain('<header>Persistent header</header>')
    expect(result.html).toContain('data-routeveil-phase="idle"')
    expect(result.html).toContain('<main>Static route</main>')
    expect(result.html).not.toContain('data-routeveil-overlay-root')
  })
})
