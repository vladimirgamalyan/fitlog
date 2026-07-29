import { defineConfig } from 'vitest/config'

// Deliberately separate from vite.config.ts: the PWA plugin has nothing to do
// with unit tests and only slows them down.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
