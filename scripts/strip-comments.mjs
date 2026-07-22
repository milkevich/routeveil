import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import ts from 'typescript'

const paths = process.argv.slice(2)

if (paths.length === 0) {
  throw new Error('Provide at least one JavaScript file to clean.')
}

async function collectFiles(path) {
  const details = await stat(path)
  if (details.isFile()) return [path]
  if (!details.isDirectory()) return []

  const entries = await readdir(path, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const entryPath = join(path, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath))
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(entryPath)
    }
  }
  return files
}

const files = (await Promise.all(paths.map(collectFiles))).flat()

if (files.length === 0) {
  throw new Error('No JavaScript files were found.')
}

for (const path of files) {
  const source = await readFile(path, 'utf8')
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    source,
  )
  const ranges = []

  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (
      token === ts.SyntaxKind.SingleLineCommentTrivia
      || token === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      ranges.push([scanner.getTokenPos(), scanner.getTextPos()])
    }
  }

  let output = source
  for (const [start, end] of ranges.reverse()) {
    output = `${output.slice(0, start)} ${output.slice(end)}`
  }

  await writeFile(path, output)
}
