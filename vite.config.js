import { defineConfig } from 'vite'

export default defineConfig({
  base: '/Yellow-CYD-party/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        manualChunks: {
          'yaml-engine': ['./src/modules/yaml-engine.js'],
          'validation': ['./src/modules/validation-engine.js'],
          'store': ['./src/modules/store.js'],
          'config': ['./src/modules/config.js']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
