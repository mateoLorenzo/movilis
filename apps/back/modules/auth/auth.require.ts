import type { FastifyReply, FastifyRequest } from 'fastify'

export async function requireAccessUserId(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ message: 'Invalid access token' })
    return null
  }

  if (request.user.tokenType !== 'access' || !request.user.sub) {
    reply.code(401).send({ message: 'Invalid access token' })
    return null
  }

  return request.user.sub
}
