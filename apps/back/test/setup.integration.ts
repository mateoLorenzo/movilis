import { afterAll, beforeAll, beforeEach } from 'vitest'

import {
  migrateTestDatabase,
  resetTestDatabase,
  testPool,
} from './database.js'

beforeAll(async () => {
  await migrateTestDatabase()
})

beforeEach(async () => {
  await resetTestDatabase()
})

afterAll(async () => {
  await testPool.end()
})
