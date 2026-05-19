import { defineConfig } from 'vite'
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// Recursive copy function for cyd-lib/
function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    statSync(srcPath).isDirectory() ? copyDir(srcPath, destPath) : copyFileSync(srcPath, destPath)
  }
}

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
  plugins: [
    {
      name: 'copy-cyd-lib',
      closeBundle() {
        copyDir('./cyd-lib', join(__dirname, 'dist', 'cyd-lib'))
      }
    }
  ],
  server: {
    port: 3000,
    open: true
  }
})
