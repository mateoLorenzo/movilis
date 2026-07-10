import type { FastifyPluginAsync } from 'fastify'

import { getUserById } from './users.controllers.js'
import { getUserByIdSchema } from './users.schema.js'

const usersRoutes: FastifyPluginAsync = async (app) => {
  app.get('/:id', { schema: getUserByIdSchema }, getUserById)
}

export default usersRoutes
