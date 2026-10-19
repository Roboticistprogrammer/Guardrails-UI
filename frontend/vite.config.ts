/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// scripts/dev.sh sets API_PORT to the backend's port.
const apiPort = process.env.API_PORT ?? '6173'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // brand/ lives at the repo root, outside the Vite root.
    fs: { allow: ['..'] },
    proxy: { '/api': `http://127.0.0.1:${apiPort}` },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: false,
  },
})
