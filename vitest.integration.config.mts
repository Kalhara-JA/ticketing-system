import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
 
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup/env.ts', 'tests/setup/global.ts'],
    hookTimeout: 300000, // 5 minutes for container startup
    testTimeout: 120000,
    // Run integration tests in a single process to share containers
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // Use single thread for integration tests
      },
    },
    // Ensure tests run in order for integration flow
    sequence: {
      concurrent: false,
    },
  },
})
