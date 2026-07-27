import type { FastifyRequest } from 'fastify'

import { AppError } from '../../errors.js'

export async function requireAccessUserId(request: FastifyRequest) {
  try {
    await request.jwtVerify()
  } catch {
    throw new AppError('UNAUTHENTICATED', 'Authentication required')
  }

  if (request.user.tokenType !== 'access' || !request.user.sub) {
    throw new AppError('UNAUTHENTICATED', 'Authentication required')
  }

  return request.user.sub
}
