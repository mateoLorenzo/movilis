import fastifyJwt from '@fastify/jwt'
import type { FastifyInstance } from 'fastify'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub?: string
      phoneNumber?: string
      tokenType: 'access' | 'onboarding'
    }
    user: {
      sub?: string
      phoneNumber?: string
      tokenType: 'access' | 'onboarding'
    }
  }
}

export async function registerAuth(app: FastifyInstance, jwtSecret: string) {
  await app.register(fastifyJwt, { secret: jwtSecret })
}
