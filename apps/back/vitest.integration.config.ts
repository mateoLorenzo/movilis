import 'dotenv/config'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.integration.test.ts'],
    setupFiles: ['./test/setup.integration.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    sequence: { concurrent: false },
  },
})
