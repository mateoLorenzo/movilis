import fastifyJwt from '@fastify/jwt'
import type { FastifyInstance } from 'fastify'

import type { AuthConfig } from './config.js'

// Existing route code consumes this until endpoint behavior adopts app.authConfig.
export const authConfig: AuthConfig = {
  accessTokenTtlSeconds: readPositiveIntEnv(
    'ACCESS_TOKEN_TTL_SECONDS',
    15 * 60,
  ),
  refreshTokenTtlSeconds: readPositiveIntEnv(
    'REFRESH_TOKEN_TTL_SECONDS',
    30 * 24 * 60 * 60,
  ),
  otpTtlSeconds: readPositiveIntEnv('OTP_TTL_SECONDS', 10 * 60),
  exposeDevOtpCode: process.env.AUTH_EXPOSE_DEV_OTP_CODE === 'true',
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

export async function registerAuth(app: FastifyInstance, jwtSecret: string) {
  await app.register(fastifyJwt, { secret: jwtSecret })
}

function readPositiveIntEnv(name: string, fallback: number): number {
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
