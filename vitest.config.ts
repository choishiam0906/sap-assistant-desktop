import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/__tests__/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['src/renderer/__tests__/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/renderer/**/*.{ts,tsx}', 'src/main/**/*.ts'],
      exclude: [
        'src/renderer/__tests__/**',
        'src/renderer/main.tsx',
        'src/main/**/__tests__/**',
        'src/main/index.ts',
        'src/main/logger.ts',
      ],
      thresholds: {
        lines: 20,
        functions: 20,
        branches: 15,
      },
    },
  },
})
