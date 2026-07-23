import assert from 'node:assert/strict'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const expected = {
  react: process.env.ROUTEVEIL_EXPECT_REACT,
  reactDom: process.env.ROUTEVEIL_EXPECT_REACT_DOM,
  reactRouterDom: process.env.ROUTEVEIL_EXPECT_REACT_ROUTER_DOM,
}

function readPackage(name) {
  return JSON.parse(readFileSync(require.resolve(`${name}/package.json`), 'utf8'))
}

assert.equal(readPackage('react').version, expected.react)
assert.equal(readPackage('react-dom').version, expected.reactDom)
assert.equal(readPackage('react-router-dom').version, expected.reactRouterDom)

const publicApi = await import('routeveil/react-router')
const expectedExports = [
  'RouteveilLink',
  'RouteveilProvider',
  'RouteveilView',
  'useRouteveilNavigate',
  'useRouteveilTransition',
]

assert.deepEqual(Object.keys(publicApi).toSorted(), expectedExports.toSorted())

const routeveilEntry = import.meta.resolve('routeveil/react-router')
const routeveilRequire = createRequire(routeveilEntry)
const fixtureReact = realpathSync(require.resolve('react'))
const routeveilReact = realpathSync(routeveilRequire.resolve('react'))
const routeveilDirectory = dirname(dirname(fileURLToPath(routeveilEntry)))

assert.equal(routeveilReact, fixtureReact)
assert.equal(existsSync(resolve(routeveilDirectory, 'node_modules/react')), false)
process.stdout.write('Packed package import and dependency identity are valid.\n')
