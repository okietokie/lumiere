import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const srcRoot = fileURLToPath(new URL('./src', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': srcRoot,
      '@components': path.join(srcRoot, 'components'),
      '@hooks': path.join(srcRoot, 'hooks'),
      '@utils': path.join(srcRoot, 'utils'),
    },
  },
})
