import 'dotenv/config'

import { buildApp } from './app.js'
import { loadConfig } from './config.js'
import { createDatabase } from './db.js'

async function start() {
  const config = loadConfig(process.env)
  const database = await createDatabase(config.databaseUrl)
  const app = await buildApp({
    db: database.db,
    jwtSecret: config.jwtSecret,
    authConfig: config.auth,
    closeDatabase: database.close,
  })

  try {
    const address = await app.listen({ port: config.port, host: '0.0.0.0' })
    app.log.info({ address }, 'Server listening')
  } catch (error) {
    app.log.error(error)
    await app.close()
    process.exitCode = 1
  }
}

await start()
