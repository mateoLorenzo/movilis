import type { Db } from '@movilis/db'
import fastify, { type FastifyServerOptions } from 'fastify'

import { registerAuth } from './auth.js'
import type { AuthConfig } from './config.js'
import { registerErrorHandling } from './errors.js'
import authRoutes from './modules/auth/auth.routes.js'
import tripsRoutes from './modules/trips/trips.routes.js'
import usersRoutes from './modules/users/users.routes.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
  }
}

export type BuildAppOptions = {
  db: Db
  jwtSecret: string
  authConfig: AuthConfig
  logger?: FastifyServerOptions['logger']
  closeDatabase?: () => Promise<void>
}

export async function buildApp(options: BuildAppOptions) {
  const app = fastify({
    logger: options.logger ?? true,
    routerOptions: { ignoreTrailingSlash: true },
  })
  registerErrorHandling(app)
  app.decorate('db', options.db)
  app.decorate('authConfig', options.authConfig)

  if (options.closeDatabase) {
    app.addHook('onClose', options.closeDatabase)
  }

  await registerAuth(app, options.jwtSecret)
  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(tripsRoutes, { prefix: '/trips' })
  await app.register(usersRoutes, { prefix: '/users' })
  return app
}
