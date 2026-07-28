export interface AuthSecurityConfig {
  accessTokenTtlSeconds: number
  refreshTokenTtlSeconds: number
  otpTtlSeconds: number
  exposeDevOtpCode: boolean
  otpCodeHmacSecret: string | undefined
  rateLimitHmacSecret: string | undefined
  resendCooldownSeconds: number
  phoneWindowSeconds: number
  phoneWindowMaxRequests: number
  ipWindowSeconds: number
  ipWindowMaxRequests: number
  deviceWindowSeconds: number
  deviceWindowMaxRequests: number
  maxOtpAttempts: number
  otpRetentionSeconds: number
  sessionRetentionSeconds: number
  cleanupBatchSize: number
}

export interface SmsConfig {
  accountSid: string | undefined
  authToken: string | undefined
  fromNumber: string | undefined
  messagingServiceSid: string | undefined
  timeoutMs: number
}

export type NodeEnvironment = 'development' | 'test' | 'production'

export type AppConfig = {
  databaseUrl: string
  jwtSecret: string
  nodeEnv: NodeEnvironment
  port: number
  trustedProxies: string[]
  auth: AuthSecurityConfig
  sms: SmsConfig
}

export type CleanupConfig = {
  databaseUrl: string
  otpRetentionSeconds: number
  sessionRetentionSeconds: number
  batchSize: number
}

declare module 'fastify' {
  interface FastifyInstance {
    authConfig: AuthSecurityConfig
  }
}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const nodeEnv = nodeEnvironment(env.NODE_ENV)
  const production = nodeEnv === 'production'
  const exposeDevOtpCode = env.AUTH_EXPOSE_DEV_OTP_CODE === 'true'
  if (production && exposeDevOtpCode) {
    throw new Error('AUTH_EXPOSE_DEV_OTP_CODE cannot be enabled in production')
  }

  let otpCodeHmacSecret = optional(env, 'OTP_CODE_HMAC_SECRET')
  let rateLimitHmacSecret = optional(env, 'AUTH_RATE_LIMIT_HMAC_SECRET')
  if (
    otpCodeHmacSecret !== undefined &&
    otpCodeHmacSecret === rateLimitHmacSecret
  ) {
    throw new Error('OTP and rate-limit HMAC secrets must differ')
  }
  if (production) {
    otpCodeHmacSecret = strongSecret(env, 'OTP_CODE_HMAC_SECRET')
    rateLimitHmacSecret = strongSecret(env, 'AUTH_RATE_LIMIT_HMAC_SECRET')
    const configuredJwtSecret = optional(env, 'JWT_SECRET')
    if (otpCodeHmacSecret === configuredJwtSecret) {
      throw new Error('OTP_CODE_HMAC_SECRET must differ from JWT_SECRET')
    }
    if (rateLimitHmacSecret === configuredJwtSecret) {
      throw new Error(
        'AUTH_RATE_LIMIT_HMAC_SECRET must differ from JWT_SECRET',
      )
    }
  }

  const accountSid = optional(env, 'TWILIO_ACCOUNT_SID')
  const authToken = optional(env, 'TWILIO_AUTH_TOKEN')
  const fromNumber = optional(env, 'TWILIO_FROM_NUMBER')
  const messagingServiceSid = optional(env, 'TWILIO_MESSAGING_SERVICE_SID')
  if (production) {
    required(env, 'TWILIO_ACCOUNT_SID')
    required(env, 'TWILIO_AUTH_TOKEN')
    if ((fromNumber === undefined) === (messagingServiceSid === undefined)) {
      throw new Error(
        'Exactly one of TWILIO_FROM_NUMBER and TWILIO_MESSAGING_SERVICE_SID is required',
      )
    }
  }

  const resendCooldownSeconds = positiveInteger(
    env,
    'AUTH_RESEND_COOLDOWN_SECONDS',
    60,
  )
  const phoneWindowSeconds = positiveInteger(
    env,
    'AUTH_PHONE_WINDOW_SECONDS',
    15 * 60,
  )
  const ipWindowSeconds = positiveInteger(
    env,
    'AUTH_IP_WINDOW_SECONDS',
    15 * 60,
  )
  const deviceWindowSeconds = positiveInteger(
    env,
    'AUTH_DEVICE_WINDOW_SECONDS',
    15 * 60,
  )
  const retention = authRetention(env, [
    resendCooldownSeconds,
    phoneWindowSeconds,
    ipWindowSeconds,
    deviceWindowSeconds,
  ])

  return {
    databaseUrl: required(env, 'DATABASE_URL'),
    jwtSecret: jwtSecret(env),
    nodeEnv,
    port: positiveInteger(env, 'PORT', 8080),
    trustedProxies: commaSeparated(env.AUTH_TRUST_PROXY),
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
      otpCodeHmacSecret,
      rateLimitHmacSecret,
      resendCooldownSeconds,
      phoneWindowSeconds,
      phoneWindowMaxRequests: positiveInteger(
        env,
        'AUTH_PHONE_WINDOW_MAX_REQUESTS',
        3,
      ),
      ipWindowSeconds,
      ipWindowMaxRequests: positiveInteger(
        env,
        'AUTH_IP_WINDOW_MAX_REQUESTS',
        10,
      ),
      deviceWindowSeconds,
      deviceWindowMaxRequests: positiveInteger(
        env,
        'AUTH_DEVICE_WINDOW_MAX_REQUESTS',
        5,
      ),
      maxOtpAttempts: positiveInteger(env, 'AUTH_MAX_OTP_ATTEMPTS', 3),
      ...retention,
      cleanupBatchSize: positiveInteger(
        env,
        'AUTH_CLEANUP_BATCH_SIZE',
        500,
      ),
    },
    sms: {
      accountSid,
      authToken,
      fromNumber,
      messagingServiceSid,
      timeoutMs: positiveInteger(env, 'TWILIO_TIMEOUT_MS', 10_000),
    },
  }
}

export function loadCleanupConfig(env: NodeJS.ProcessEnv): CleanupConfig {
  const retention = authRetention(env, [
    positiveInteger(env, 'AUTH_RESEND_COOLDOWN_SECONDS', 60),
    positiveInteger(env, 'AUTH_PHONE_WINDOW_SECONDS', 15 * 60),
    positiveInteger(env, 'AUTH_IP_WINDOW_SECONDS', 15 * 60),
    positiveInteger(env, 'AUTH_DEVICE_WINDOW_SECONDS', 15 * 60),
  ])
  return {
    databaseUrl: required(env, 'DATABASE_URL'),
    ...retention,
    batchSize: positiveInteger(env, 'AUTH_CLEANUP_BATCH_SIZE', 500),
  }
}

function jwtSecret(env: NodeJS.ProcessEnv): string {
  const value = required(env, 'JWT_SECRET')
  if (!isStrongSecret(value)) {
    throw new Error(
      'JWT_SECRET must be at least 32 UTF-8 bytes and not a placeholder',
    )
  }
  return value
}

function strongSecret(env: NodeJS.ProcessEnv, name: string): string {
  const value = required(env, name)
  if (!isStrongSecret(value)) {
    throw new Error(
      `${name} must be at least 32 UTF-8 bytes and not a placeholder`,
    )
  }
  return value
}

function isStrongSecret(value: string): boolean {
  const placeholders = new Set([
    'change-me',
    'replace-me',
    'replace-with-a-long-random-secret',
    'your-secret-here',
  ])
  return (
    Buffer.byteLength(value, 'utf8') >= 32 &&
    !placeholders.has(value.toLowerCase())
  )
}

function nodeEnvironment(value: string | undefined): NodeEnvironment {
  const parsed = value?.trim() || 'development'
  if (parsed !== 'development' && parsed !== 'test' && parsed !== 'production') {
    throw new Error('NODE_ENV must be development, test, or production')
  }
  return parsed
}

function authRetention(
  env: NodeJS.ProcessEnv,
  requestWindows: number[],
): Pick<AuthSecurityConfig, 'otpRetentionSeconds' | 'sessionRetentionSeconds'> {
  const otpMinimum = Math.max(86_400, ...requestWindows)
  const otpRetentionSeconds = minimumInteger(
    env,
    'AUTH_OTP_RETENTION_SECONDS',
    86_400,
    otpMinimum,
  )
  const sessionRetentionSeconds = minimumInteger(
    env,
    'AUTH_SESSION_RETENTION_SECONDS',
    2_592_000,
    2_592_000,
  )
  return { otpRetentionSeconds, sessionRetentionSeconds }
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = optional(env, name)
  if (!value) throw new Error(`${name} is required`)
  return value
}

function optional(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]?.trim()
  return value || undefined
}

function commaSeparated(value: string | undefined): string[] {
  return value
    ? value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    : []
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

function minimumInteger(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
): number {
  const value = positiveInteger(env, name, fallback)
  if (value < minimum) {
    throw new Error(`${name} must be at least ${minimum}`)
  }
  return value
}
