import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const expectedExports = [
  'RouteveilLink',
  'RouteveilProvider',
  'RouteveilView',
  'useRouteveilNavigate',
  'useRouteveilTransition',
]

assert.equal(packageJson.name, 'routeveil')
assert.deepEqual(Object.keys(packageJson.exports), ['./react-router'])
assert.equal(packageJson.exports['./react-router'].import, './dist/react-router.js')
assert.deepEqual(packageJson.files, [
  'dist/react-router.js',
  'dist/types',
  'README.md',
])

await access(resolve(root, packageJson.exports['./react-router'].import))
await access(resolve(root, packageJson.exports['./react-router'].types))

const publicApi = await import('routeveil/react-router')
assert.deepEqual(Object.keys(publicApi).sort(), expectedExports.toSorted())
assert.ok(publicApi.RouteveilLink)
assert.ok(publicApi.RouteveilView)
assert.equal(typeof publicApi.RouteveilProvider, 'function')
assert.equal(typeof publicApi.useRouteveilNavigate, 'function')
assert.equal(typeof publicApi.useRouteveilTransition, 'function')

let rootImportBlocked = false
try {
  await import('routeveil')
} catch (error) {
  rootImportBlocked = (
    typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED'
  )
}

assert.equal(rootImportBlocked, true, 'The routeveil package root must remain private')
process.stdout.write('Package exports and built entry points are valid.\n')
