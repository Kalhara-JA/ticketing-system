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
    // Run integration tests sequentially to share containers
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Use single process for integration tests
      },
    },
    // Ensure tests run in order for integration flow
    sequence: {
      concurrent: false,
    },
  },
})
