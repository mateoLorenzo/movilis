import type { FastifyInstance } from 'fastify'

import { buildApp } from './app.js'
import type { AppConfig } from './config.js'
import { createDatabase } from './db.js'

export type StartServerDependencies = {
  createDatabase: typeof createDatabase
  buildApp: typeof buildApp
}

const defaultDependencies: StartServerDependencies = {
  createDatabase,
  buildApp,
}

export async function startServer(
  config: AppConfig,
  dependencies = defaultDependencies,
): Promise<FastifyInstance> {
  const database = await dependencies.createDatabase(config.databaseUrl)
  let app: FastifyInstance | undefined

  try {
    app = await dependencies.buildApp({
      db: database.db,
      jwtSecret: config.jwtSecret,
      authConfig: config.auth,
      closeDatabase: database.close,
    })
    const address = await app.listen({
      port: config.port,
      host: '0.0.0.0',
    })
    app.log.info({ address }, 'Server listening')
    return app
  } catch (error) {
    if (app) {
      await app.close()
    } else {
      await database.close()
    }
    throw error
  }
}
