import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
  environments: {
    client: {
      keepProcessEnv: true,
    },
  },
  build: {
    emptyOutDir: true,
    minify: 'terser',
    lib: {
      entry: 'src/react-router/index.ts',
      formats: ['es'],
      fileName: () => 'react-router.js',
    },
    rolldownOptions: {
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-dom/jsx-runtime',
        'react/jsx-runtime',
        'react-router',
        'react-router-dom',
      ],
      output: {
        comments: false,
      },
    },
    terserOptions: {
      format: {
        comments: false,
      },
    },
  },
})
