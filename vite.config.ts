import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {
  indexRobots,
  resolveSeoRoute,
  socialImageUrl,
} from './src/app/shared/lib/seoRoutes.js'

const homeRoute = resolveSeoRoute('/')

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;')
}

const seoTemplateValues = {
  __ROUTEVEIL_SEO_CANONICAL__: homeRoute.canonicalUrl ?? '',
  __ROUTEVEIL_SEO_DESCRIPTION__: homeRoute.description,
  __ROUTEVEIL_SEO_IMAGE__: socialImageUrl,
  __ROUTEVEIL_SEO_ROBOTS__: indexRobots,
  __ROUTEVEIL_SEO_TITLE__: homeRoute.title,
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'routeveil-seo-template',
      transformIndexHtml(html) {
        return Object.entries(seoTemplateValues).reduce(
          (output, [token, value]) => output.replaceAll(token, escapeHtml(value)),
          html,
        )
      },
    },
  ],
  build: {
    outDir: 'dist/demo',
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    minify: 'terser',
    terserOptions: {
      format: {
        comments: false,
      },
    },
  },
})
