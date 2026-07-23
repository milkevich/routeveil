import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import compatibility from '../src/app/data/compatibility.json'

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('compatibility contract', () => {
  it('keeps package peers aligned with the shared compatibility data', () => {
    const packageJson = JSON.parse(readProjectFile('package.json'))

    expect(packageJson.peerDependencies).toEqual({
      react: compatibility.supported.react,
      'react-dom': compatibility.supported.reactDom,
      'react-router-dom': compatibility.supported.reactRouterDom,
    })
    expect(compatibility.packageName).toBe(packageJson.name)
    expect(compatibility.importPath).toBe('routeveil/react-router')
  })

  it('keeps manual and machine-readable documentation aligned', () => {
    const readme = readProjectFile('README.md')
    const llms = readProjectFile('public/llms.txt')
    const llmsFull = readProjectFile('public/llms-full.txt')

    for (const range of Object.values(compatibility.supported)) {
      expect(readme).toContain(range)
      expect(llms).toContain(range)
      expect(llmsFull).toContain(range)
    }

    for (const fixture of compatibility.fixtures) {
      for (const version of [
        `React ${fixture.react}`,
        `React DOM ${fixture.reactDom}`,
        `React Router DOM ${fixture.reactRouterDom}`,
      ]) {
        expect(llms).toContain(version)
        expect(llmsFull).toContain(version)
      }
    }

    for (const unsupported of compatibility.unsupported) {
      expect(llms).toContain(unsupported)
      expect(llmsFull).toContain(unsupported)
    }
  })

  it('runs every verified fixture in CI and excludes fixtures from publishing', () => {
    const workflow = readProjectFile('.github/workflows/ci.yml')
    const packageJson = JSON.parse(readProjectFile('package.json'))

    for (const fixture of compatibility.fixtures) {
      expect(workflow).toContain(`- ${fixture.id}`)
    }

    expect(packageJson.files).toEqual([
      'dist/react-router.js',
      'dist/types',
      'README.md',
    ])
    expect(packageJson.scripts['test:compat']).toContain(
      'scripts/run-compatibility.mjs',
    )
  })
})
