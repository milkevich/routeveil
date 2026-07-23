import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import ts from 'typescript'

const root = resolve(import.meta.dirname, '..')
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const compatibility = JSON.parse(
  await readFile(resolve(root, 'src/app/data/compatibility.json'), 'utf8'),
)
const builtEntryPath = resolve(
  root,
  packageJson.exports['./react-router'].import,
)
const expectedExports = [
  'RouteveilLink',
  'RouteveilProvider',
  'RouteveilView',
  'useRouteveilNavigate',
  'useRouteveilTransition',
]
const expectedFiles = [
  'dist/react-router.js',
  'dist/types',
  'README.md',
]
const expectedPeerDependencies = {
  react: compatibility.supported.react,
  'react-dom': compatibility.supported.reactDom,
  'react-router-dom': compatibility.supported.reactRouterDom,
}
const allowedRuntimePackages = new Set(Object.keys(expectedPeerDependencies))

function runtimePackage(specifier) {
  if (specifier.startsWith('@')) {
    return specifier.split('/').slice(0, 2).join('/')
  }

  return specifier.split('/')[0]
}

function collectRuntimeImports(source) {
  const sourceFile = ts.createSourceFile(
    builtEntryPath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  )
  const imports = new Set()

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier
      && ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.add(node.moduleSpecifier.text)
    }

    if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length === 1
      && ts.isStringLiteral(node.arguments[0])
    ) {
      imports.add(node.arguments[0].text)
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return [...imports].toSorted()
}

assert.equal(packageJson.name, 'routeveil')
assert.equal(compatibility.packageName, packageJson.name)
assert.equal(compatibility.importPath, 'routeveil/react-router')
assert.deepEqual(Object.keys(packageJson.exports), ['./react-router'])
assert.equal(packageJson.exports['./react-router'].import, './dist/react-router.js')
assert.equal(packageJson.sideEffects, false)
assert.deepEqual(packageJson.files, expectedFiles)
assert.deepEqual(packageJson.peerDependencies, expectedPeerDependencies)
assert.deepEqual(packageJson.dependencies ?? {}, {})

await access(builtEntryPath)
await access(resolve(root, packageJson.exports['./react-router'].types))

for (const name of ['window', 'document', 'Element', 'Animation', 'matchMedia']) {
  assert.equal(
    Object.hasOwn(globalThis, name),
    false,
    `Package validation must run without the browser global ${name}`,
  )
}

const publicApi = await import('routeveil/react-router')
assert.deepEqual(Object.keys(publicApi).sort(), expectedExports.toSorted())
assert.ok(publicApi.RouteveilLink)
assert.ok(publicApi.RouteveilView)
assert.equal(typeof publicApi.RouteveilProvider, 'function')
assert.equal(typeof publicApi.useRouteveilNavigate, 'function')
assert.equal(typeof publicApi.useRouteveilTransition, 'function')

const serverMarkup = renderToString(
  createElement(
    MemoryRouter,
    { initialEntries: ['/docs'] },
    createElement(
      publicApi.RouteveilProvider,
      null,
      createElement(
        'header',
        { 'data-package-shell': 'header' },
        createElement(
          publicApi.RouteveilLink,
          { to: '/docs', transition: 'fade' },
          'Documentation link',
        ),
      ),
      createElement(
        publicApi.RouteveilView,
        { className: 'route-stage' },
        createElement('main', null, 'Documentation'),
      ),
      createElement('footer', { 'data-package-shell': 'footer' }, 'Footer'),
    ),
  ),
)

assert.match(serverMarkup, /data-package-shell="header"/u)
assert.match(serverMarkup, /data-package-shell="footer"/u)
assert.match(serverMarkup, /data-routeveil-view=""/u)
assert.match(serverMarkup, /data-routeveil-phase="idle"/u)
assert.match(serverMarkup, /href="\/docs"/u)
assert.match(serverMarkup, /<main>Documentation<\/main>/u)
assert.doesNotMatch(serverMarkup, /data-routeveil-overlay-root/u)
assert.doesNotMatch(serverMarkup, /aria-busy/u)

for (const name of ['window', 'document', 'Element', 'Animation', 'matchMedia']) {
  assert.equal(
    Object.hasOwn(globalThis, name),
    false,
    `Package import and server rendering must not create ${name}`,
  )
}

const builtEntry = await readFile(builtEntryPath, 'utf8')
const runtimeImports = collectRuntimeImports(builtEntry)
assert.ok(runtimeImports.length > 0, 'The runtime bundle must retain peer imports')

for (const specifier of runtimeImports) {
  assert.equal(
    specifier.startsWith('.') || specifier.startsWith('/'),
    false,
    `The single-file runtime bundle contains an unresolved import: ${specifier}`,
  )
  assert.equal(
    allowedRuntimePackages.has(runtimePackage(specifier)),
    true,
    `The runtime bundle imports undeclared runtime package: ${specifier}`,
  )
}

assert.deepEqual(
  [...new Set(runtimeImports.map(runtimePackage))].toSorted(),
  Object.keys(expectedPeerDependencies).toSorted(),
)

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
process.stdout.write(
  'Package exports, peer boundaries, runtime imports, and server rendering are valid.\n',
)
