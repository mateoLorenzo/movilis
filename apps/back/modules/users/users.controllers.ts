import type { GetUserByIdParams } from '@movilis/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'

import { AppError } from '../../errors.js'
import { toPublicUser } from './users.mapper.js'
import { usersService } from './users.service.js'

export async function getUserById(
  request: FastifyRequest<{ Params: GetUserByIdParams }>,
  reply: FastifyReply,
) {
  const user = await usersService.getById(request.server.db, request.params.id)
  if (!user) {
    throw new AppError('USER_NOT_FOUND', 404, 'User not found')
  }
  return reply.send(toPublicUser(user))
}
