import fastifyJwt from '@fastify/jwt'
import type { FastifyInstance } from 'fastify'

// TODO: Consider moving authConfig to a separate config file if it grows significantly in the future
export const authConfig = {
  accessTokenTtlSeconds: readPositiveIntEnv(
    'ACCESS_TOKEN_TTL_SECONDS',
    15 * 60,
  ),
  refreshTokenTtlSeconds: readPositiveIntEnv(
    'REFRESH_TOKEN_TTL_SECONDS',
    30 * 24 * 60 * 60,
  ),
  otpTtlSeconds: readPositiveIntEnv('OTP_TTL_SECONDS', 10 * 60),
}

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

export async function registerAuth(app: FastifyInstance) {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error('JWT_SECRET is required')
  }

  await app.register(fastifyJwt, { secret })
}

function readPositiveIntEnv(name: string, fallback: number) {
  const rawValue = process.env[name]

  if (!rawValue) {
    return fallback
  }

  const value = Number(rawValue)

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }

  return value
}
