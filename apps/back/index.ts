import 'dotenv/config'

import fastify from 'fastify'

import { registerDb } from './db.js'
import usersRoutes from './modules/users/users.routes.js'

const server = fastify({
  logger: true,
})

async function start() {
  try {
    await registerDb(server)

    server.register(usersRoutes, { prefix: '/users' })

    const address = await server.listen({ port: 8080 })
    server.log.info(`Server listening at ${address}`)
  } catch (error) {
    server.log.error(error)
    process.exit(1)
  }
}

await start()
