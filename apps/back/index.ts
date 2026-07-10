import 'dotenv/config'

import fastify from 'fastify'

import { registerAuth } from './auth.js'
import { registerDb } from './db.js'
import authRoutes from './modules/auth/auth.routes.js'
import usersRoutes from './modules/users/users.routes.js'

const server = fastify({
  logger: true,
})

async function start() {
  try {
    await registerDb(server)
    await registerAuth(server)

    server.register(authRoutes, { prefix: '/auth' })
    server.register(usersRoutes, { prefix: '/users' })

    const address = await server.listen({ port: 8080 })
    server.log.info(`Server listening at ${address}`)
  } catch (error) {
    server.log.error(error)
    process.exit(1)
  }
}

await start()
