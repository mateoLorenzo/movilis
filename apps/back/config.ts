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
  return {
    databaseUrl: required(env, 'DATABASE_URL'),
    jwtSecret: required(env, 'JWT_SECRET'),
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
      exposeDevOtpCode: env.AUTH_EXPOSE_DEV_OTP_CODE === 'true',
    },
  }
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
