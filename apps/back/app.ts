import type { Db } from '@movilis/db'
import fastify, { type FastifyServerOptions } from 'fastify'

import { registerAuth } from './auth.js'
import type { AuthSecurityConfig } from './config.js'
import { registerErrorHandling, safeErrorType } from './errors.js'
import authRoutes from './modules/auth/auth.routes.js'
import type { SmsSender } from './modules/auth/sms.sender.js'
import tripsRoutes from './modules/trips/trips.routes.js'
import usersRoutes from './modules/users/users.routes.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    smsSender: SmsSender
  }
}

export type BuildAppOptions = {
  db: Db
  jwtSecret: string
  authConfig: AuthSecurityConfig
  smsSender: SmsSender
  trustedProxies: string[]
  logger?: FastifyServerOptions['logger']
  closeDatabase?: () => Promise<void>
}

export async function buildApp(options: BuildAppOptions) {
  const app = fastify({
    logger: secureLogger(options.logger),
    trustProxy: options.trustedProxies,
  })
  registerErrorHandling(app)
  app.decorate('db', options.db)
  app.decorate('authConfig', options.authConfig)
  app.decorate('smsSender', options.smsSender)

  if (options.closeDatabase) {
    app.addHook('onClose', options.closeDatabase)
  }

  await registerAuth(app, options.jwtSecret)
  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(tripsRoutes, { prefix: '/trips' })
  await app.register(usersRoutes, { prefix: '/users' })
  return app
}

function secureLogger(logger: BuildAppOptions['logger']) {
  if (logger === false) return false
  const configured = logger && typeof logger === 'object' ? logger : {}
  return {
    ...configured,
    serializers: {
      ...configured.serializers,
      req(request: { method?: string }) {
        return { method: request.method }
      },
      res(reply: { statusCode?: number }) {
        return { statusCode: reply.statusCode }
      },
      err(error: unknown) {
        return {
          type: safeErrorType(error),
          message: 'Redacted error',
          stack: '',
        }
      },
    },
  }
}
