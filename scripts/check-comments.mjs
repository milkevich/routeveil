import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import process from 'node:process'
import ts from 'typescript'

const root = resolve(import.meta.dirname, '..')
const includeDist = process.argv.includes('--include-dist')
const excludedDirectories = new Set(['.git', 'dist', 'node_modules'])
const excludedFiles = new Set(['package-lock.json'])
const codeExtensions = new Set([
  '.cjs',
  '.js',
  '.jsx',
  '.json',
  '.mjs',
  '.ts',
  '.tsx',
])
const markupExtensions = new Set(['.html', '.md', '.svg'])
const lineCommentFiles = new Set(['.env', '.gitignore', '.npmrc'])
const lineCommentExtensions = new Set(['.bash', '.sh', '.yaml', '.yml', '.zsh'])
const failures = []

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) {
        files.push(...await collectFiles(path))
      }
    } else if (entry.isFile() && !excludedFiles.has(entry.name)) {
      files.push(path)
    }
  }

  return files
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split(/\r?\n/u).length
}

function record(path, source, offset, kind) {
  failures.push(`${relative(root, path)}:${lineNumber(source, offset)} ${kind}`)
}

function scanCode(path, source) {
  const jsx = path.endsWith('.jsx') || path.endsWith('.tsx')
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    jsx ? ts.LanguageVariant.JSX : ts.LanguageVariant.Standard,
    source,
  )

  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (
      token === ts.SyntaxKind.SingleLineCommentTrivia
      || token === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      record(path, source, scanner.getTokenPos(), 'contains a code comment')
    }
  }
}

function scanOccurrences(path, source, marker, kind) {
  let offset = source.indexOf(marker)
  while (offset !== -1) {
    record(path, source, offset, kind)
    offset = source.indexOf(marker, offset + marker.length)
  }
}

function scanLineComments(path, source) {
  let offset = 0
  for (const line of source.split(/\r?\n/u)) {
    if (/^\s*#/u.test(line) && !/^\s*#!/u.test(line)) {
      record(path, source, offset, 'contains a line comment')
    }
    offset += line.length + 1
  }
}

async function scanFile(path) {
  const extension = extname(path)
  const name = path.slice(path.lastIndexOf('/') + 1)
  const source = await readFile(path, 'utf8')

  if (codeExtensions.has(extension)) {
    scanCode(path, source)
  } else if (extension === '.css') {
    scanOccurrences(path, source, '/*', 'contains a CSS comment')
  } else if (markupExtensions.has(extension)) {
    scanOccurrences(path, source, '<!--', 'contains a markup comment')
  } else if (lineCommentFiles.has(name) || lineCommentExtensions.has(extension)) {
    scanLineComments(path, source)
  }
}

const files = await collectFiles(root)

if (includeDist) {
  files.push(...await collectFiles(join(root, 'dist')))
}

for (const path of [...new Set(files)].sort()) {
  await scanFile(path)
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join('\n')}\n`)
  process.exitCode = 1
} else {
  process.stdout.write('No project-owned comments found.\n')
}
