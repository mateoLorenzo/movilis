import type { FastifyReply, FastifyRequest } from 'fastify'

import { usersService } from './users.service.js'

export async function getUserById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const user = await usersService.getById(request.server.db, request.params.id)

  if (!user) {
    return reply.code(404).send({ message: 'User not found' })
  }

  return reply.send(user)
}
