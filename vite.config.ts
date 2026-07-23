import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
