import { execFileSync } from 'node:child_process'
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, resolve } from 'node:path'
import process from 'node:process'

const root = resolve(import.meta.dirname, '..')
const manifest = JSON.parse(
  readFileSync(resolve(root, 'src/app/data/compatibility.json'), 'utf8'),
)
const requestedIds = process.argv.slice(2)
const fixtures = requestedIds.length === 0
  ? manifest.fixtures
  : requestedIds.map((id) => {
      const fixture = manifest.fixtures.find((candidate) => candidate.id === id)

      if (!fixture) {
        throw new Error(`Unknown compatibility fixture: ${id}`)
      }

      return fixture
    })
const auditRoot = mkdtempSync(resolve(tmpdir(), 'routeveil-compatibility-'))
const packageDirectory = resolve(auditRoot, 'package')
mkdirSync(packageDirectory)

function run(command, args, options = {}) {
  process.stdout.write(`\n${command} ${args.join(' ')}\n`)
  execFileSync(command, args, {
    cwd: options.cwd ?? root,
    env: {
      ...process.env,
      ...options.env,
    },
    stdio: 'inherit',
  })
}

function createTarball() {
  const configuredTarball = process.env.ROUTEVEIL_COMPAT_TARBALL

  if (configuredTarball) {
    const configuredPath = resolve(configuredTarball)

    if (!statSync(configuredPath).isDirectory()) {
      return configuredPath
    }

    const tarballs = readdirSync(configuredPath)
      .filter((file) => file.endsWith('.tgz'))

    if (tarballs.length !== 1) {
      throw new Error('Compatibility artifact directory must contain one tarball.')
    }

    return resolve(configuredPath, tarballs[0])
  }

  const output = execFileSync(
    'npm',
    [
      'pack',
      '--ignore-scripts',
      '--json',
      '--pack-destination',
      packageDirectory,
    ],
    {
      cwd: root,
      encoding: 'utf8',
    },
  )
  const result = JSON.parse(output)

  if (result.length !== 1 || !result[0]?.filename) {
    throw new Error('Routeveil package tarball was not created.')
  }

  return resolve(packageDirectory, basename(result[0].filename))
}

function writeVersionSpecificTypes(directory, fixture) {
  const source = fixture.latestRouterOptions
    ? `import { RouteveilLink, useRouteveilNavigate } from 'routeveil/react-router'

export function LatestRouterOptions() {
  const navigate = useRouteveilNavigate()

  return (
    <>
      <RouteveilLink
        defaultShouldRevalidate={false}
        mask="/displayed-link"
        to="/actual-link"
        transition="fade"
      >
        Latest Router link
      </RouteveilLink>
      <button
        onClick={() => {
          void navigate('/actual-navigation', {
            defaultShouldRevalidate: false,
            mask: '/displayed-navigation',
            transition: 'fade',
          })
        }}
        type="button"
      >
        Latest Router navigation
      </button>
    </>
  )
}
`
    : 'export {}\n'

  writeFileSync(resolve(directory, 'src/router-version-options.tsx'), source)
}

function writeFixturePackage(directory, tarball, fixture) {
  const packagePath = resolve(directory, 'package.json')
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
  packageJson.dependencies = {
    react: fixture.react,
    'react-dom': fixture.reactDom,
    'react-router-dom': fixture.reactRouterDom,
    routeveil: `file:${tarball}`,
  }
  packageJson.devDependencies = {
    ...packageJson.devDependencies,
    '@types/react': fixture.reactTypes,
    '@types/react-dom': fixture.reactDomTypes,
  }

  if (fixture.schedulerTypes) {
    packageJson.devDependencies['@types/scheduler'] = fixture.schedulerTypes
  }

  writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`)
}

function runFixture(tarball, fixture) {
  const directory = resolve(auditRoot, fixture.id)
  cpSync(resolve(root, 'compatibility/fixture'), directory, { recursive: true })
  writeVersionSpecificTypes(directory, fixture)

  run('npm', [
    'ci',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
  ], { cwd: directory })
  writeFixturePackage(directory, tarball, fixture)

  run('npm', [
    'install',
    '--package-lock=false',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--strict-peer-deps',
    '--legacy-peer-deps=false',
  ], { cwd: directory })

  run('npm', [
    'ls',
    'routeveil',
    'react',
    'react-dom',
    'react-router-dom',
    '--all',
  ], { cwd: directory })
  run('npm', ['run', 'verify:install'], {
    cwd: directory,
    env: {
      ROUTEVEIL_EXPECT_REACT: fixture.react,
      ROUTEVEIL_EXPECT_REACT_DOM: fixture.reactDom,
      ROUTEVEIL_EXPECT_REACT_ROUTER_DOM: fixture.reactRouterDom,
    },
  })
  run('npm', ['run', 'typecheck'], { cwd: directory })
  run('npm', ['run', 'test:runtime'], { cwd: directory })
  run('npm', ['run', 'build'], { cwd: directory })
  process.stdout.write(`\nCompatibility fixture passed: ${fixture.id}\n`)
}

try {
  const tarball = createTarball()

  for (const fixture of fixtures) {
    runFixture(tarball, fixture)
  }
} finally {
  rmSync(auditRoot, { recursive: true, force: true })
}
