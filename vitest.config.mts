import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
 
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup/env.ts'],
    // Standard timeouts for unit tests
    hookTimeout: 10000,
    testTimeout: 10000,
  },
})