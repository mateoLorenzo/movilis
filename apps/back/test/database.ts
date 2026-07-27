import { createDb } from '@movilis/db'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

const connectionString = process.env.TEST_DATABASE_URL
if (!connectionString) {
  throw new Error('TEST_DATABASE_URL is required for backend integration tests')
}

export const testPool = new Pool({ connectionString })
export const testDb = createDb(testPool)

const migrationsFolder = fileURLToPath(
  new URL('../../../packages/db/drizzle', import.meta.url),
)

export async function migrateTestDatabase() {
  await migrate(testDb, { migrationsFolder })
}

export async function resetTestDatabase() {
  await testPool.query(`
    TRUNCATE TABLE
      locality_discovery_digest_trips,
      locality_discovery_digests,
      notification_preferences,
      device_tokens,
      trip_alerts,
      reviews,
      trip_reservations,
      auth_sessions,
      otp_challenges,
      trips,
      users,
      cities
    RESTART IDENTITY CASCADE
  `)
}
