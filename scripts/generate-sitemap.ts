import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { renderSitemapXml } from '../src/app/shared/lib/seoRoutes'

const outputPath = resolve(process.cwd(), 'public/sitemap.xml')

await writeFile(outputPath, renderSitemapXml())
process.stdout.write('Generated public/sitemap.xml from the SEO route registry.\n')
