export type AuthConfig = {
  accessTokenTtlSeconds: number
  refreshTokenTtlSeconds: number
  otpTtlSeconds: number
  exposeDevOtpCode: boolean
}

export type AppConfig = {
  databaseUrl: string
  jwtSecret: string
  port: number
  auth: AuthConfig
}

declare module 'fastify' {
  interface FastifyInstance {
    authConfig: AuthConfig
  }
}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const exposeDevOtpCode = env.AUTH_EXPOSE_DEV_OTP_CODE === 'true'
  if (env.NODE_ENV === 'production' && exposeDevOtpCode) {
    throw new Error('AUTH_EXPOSE_DEV_OTP_CODE cannot be enabled in production')
  }

  return {
    databaseUrl: required(env, 'DATABASE_URL'),
    jwtSecret: jwtSecret(env),
    port: positiveInteger(env, 'PORT', 8080),
    auth: {
      accessTokenTtlSeconds: positiveInteger(
        env,
        'ACCESS_TOKEN_TTL_SECONDS',
        15 * 60,
      ),
      refreshTokenTtlSeconds: positiveInteger(
        env,
        'REFRESH_TOKEN_TTL_SECONDS',
        30 * 24 * 60 * 60,
      ),
      otpTtlSeconds: positiveInteger(env, 'OTP_TTL_SECONDS', 10 * 60),
      exposeDevOtpCode,
    },
  }
}

function jwtSecret(env: NodeJS.ProcessEnv): string {
  const value = required(env, 'JWT_SECRET')
  const placeholders = new Set([
    'change-me',
    'replace-with-a-long-random-secret',
    'your-secret-here',
  ])
  if (Buffer.byteLength(value, 'utf8') < 32 || placeholders.has(value)) {
    throw new Error(
      'JWT_SECRET must be at least 32 UTF-8 bytes and not a placeholder',
    )
  }
  return value
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function positiveInteger(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
): number {
  const raw = env[name]
  if (raw === undefined) return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
  return value
}
