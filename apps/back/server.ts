import type { FastifyInstance } from 'fastify'

import { buildApp } from './app.js'
import type { AppConfig } from './config.js'
import { createDatabase } from './db.js'
import { developmentSmsSender } from './modules/auth/development.sms-sender.js'
import { createTwilioSmsSender } from './modules/auth/twilio.sms-sender.js'

export type StartServerDependencies = {
  createDatabase: typeof createDatabase
  buildApp: typeof buildApp
  createTwilioSmsSender: typeof createTwilioSmsSender
}

const defaultDependencies: StartServerDependencies = {
  createDatabase,
  buildApp,
  createTwilioSmsSender,
}

export async function startServer(
  config: AppConfig,
  dependencies = defaultDependencies,
): Promise<FastifyInstance> {
  const database = await dependencies.createDatabase(config.databaseUrl)
  let app: FastifyInstance | undefined

  try {
    const smsSender =
      config.nodeEnv === 'production'
        ? dependencies.createTwilioSmsSender(config.sms)
        : developmentSmsSender
    app = await dependencies.buildApp({
      db: database.db,
      jwtSecret: config.jwtSecret,
      authConfig: config.auth,
      smsSender,
      trustedProxies: config.trustedProxies,
      closeDatabase: database.close,
    })
    await app.listen({
      port: config.port,
      host: '0.0.0.0',
      listenTextResolver: () => 'Server listening',
    })
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
