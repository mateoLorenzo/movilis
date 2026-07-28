import 'dotenv/config'

import { loadCleanupConfig } from './config.js'
import { createDatabase } from './db.js'
import { cleanupAuthData } from './modules/auth/auth.cleanup.js'

try {
  const config = loadCleanupConfig(process.env)
  const database = await createDatabase(config.databaseUrl)
  try {
    const result = await cleanupAuthData(database.db, {
      now: new Date(),
      batchSize: config.batchSize,
      otpRetentionSeconds: config.otpRetentionSeconds,
      sessionRetentionSeconds: config.sessionRetentionSeconds,
    })
    console.log(JSON.stringify(result))
  } finally {
    await database.close()
  }
} catch {
  console.error('Auth cleanup failed')
  process.exitCode = 1
}
