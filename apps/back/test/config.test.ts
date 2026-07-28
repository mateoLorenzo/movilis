import { describe, expect, it } from 'vitest'

import { loadCleanupConfig, loadConfig } from '../config.js'

const validSecret = 'a-secure-test-secret-that-is-32-bytes'
const testUrl = 'postgres://localhost/movilis'

describe('loadConfig', () => {
  it('parses explicit process configuration', () => {
    expect(
      loadConfig({
        DATABASE_URL: testUrl,
        JWT_SECRET: validSecret,
        NODE_ENV: 'test',
        PORT: '9090',
        AUTH_EXPOSE_DEV_OTP_CODE: 'true',
        ACCESS_TOKEN_TTL_SECONDS: '60',
        REFRESH_TOKEN_TTL_SECONDS: '120',
        OTP_TTL_SECONDS: '30',
        OTP_CODE_HMAC_SECRET: 'otp-secret',
        AUTH_RATE_LIMIT_HMAC_SECRET: 'rate-limit-secret',
        AUTH_RESEND_COOLDOWN_SECONDS: '31',
        AUTH_PHONE_WINDOW_SECONDS: '32',
        AUTH_PHONE_WINDOW_MAX_REQUESTS: '4',
        AUTH_IP_WINDOW_SECONDS: '33',
        AUTH_IP_WINDOW_MAX_REQUESTS: '11',
        AUTH_DEVICE_WINDOW_SECONDS: '34',
        AUTH_DEVICE_WINDOW_MAX_REQUESTS: '6',
        AUTH_MAX_OTP_ATTEMPTS: '4',
        AUTH_OTP_RETENTION_SECONDS: '86400',
        AUTH_SESSION_RETENTION_SECONDS: '2592000',
        AUTH_CLEANUP_BATCH_SIZE: '50',
        AUTH_TRUST_PROXY: '10.0.0.1, 10.0.0.0/24',
        TWILIO_ACCOUNT_SID: 'AC123',
        TWILIO_AUTH_TOKEN: 'token',
        TWILIO_FROM_NUMBER: '+15555550123',
        TWILIO_TIMEOUT_MS: '5000',
      }),
    ).toEqual({
      databaseUrl: testUrl,
      jwtSecret: validSecret,
      nodeEnv: 'test',
      port: 9090,
      trustedProxies: ['10.0.0.1', '10.0.0.0/24'],
      auth: {
        exposeDevOtpCode: true,
        accessTokenTtlSeconds: 60,
        refreshTokenTtlSeconds: 120,
        otpTtlSeconds: 30,
        otpCodeHmacSecret: 'otp-secret',
        rateLimitHmacSecret: 'rate-limit-secret',
        resendCooldownSeconds: 31,
        phoneWindowSeconds: 32,
        phoneWindowMaxRequests: 4,
        ipWindowSeconds: 33,
        ipWindowMaxRequests: 11,
        deviceWindowSeconds: 34,
        deviceWindowMaxRequests: 6,
        maxOtpAttempts: 4,
        otpRetentionSeconds: 86_400,
        sessionRetentionSeconds: 2_592_000,
        cleanupBatchSize: 50,
      },
      sms: {
        accountSid: 'AC123',
        authToken: 'token',
        fromNumber: '+15555550123',
        messagingServiceSid: undefined,
        timeoutMs: 5000,
      },
    })
  })

  it('provides secure development defaults', () => {
    const config = loadConfig({ DATABASE_URL: testUrl, JWT_SECRET: validSecret })

    expect(config).toMatchObject({
      nodeEnv: 'development',
      trustedProxies: [],
      auth: {
        resendCooldownSeconds: 60,
        phoneWindowSeconds: 900,
        phoneWindowMaxRequests: 3,
        ipWindowSeconds: 900,
        ipWindowMaxRequests: 10,
        deviceWindowSeconds: 900,
        deviceWindowMaxRequests: 5,
        maxOtpAttempts: 3,
        otpRetentionSeconds: 86_400,
        sessionRetentionSeconds: 2_592_000,
        cleanupBatchSize: 500,
      },
      sms: { timeoutMs: 10_000 },
    })
  })

  it.each(['development', 'test', 'production'] as const)(
    'accepts the closed NODE_ENV value %s',
    (nodeEnv) => {
      const env =
        nodeEnv === 'production'
          ? productionEnv()
          : { DATABASE_URL: testUrl, JWT_SECRET: validSecret, NODE_ENV: nodeEnv }
      expect(loadConfig(env).nodeEnv).toBe(nodeEnv)
    },
  )

  it('rejects an unknown nonempty NODE_ENV', () => {
    expect(() =>
      loadConfig({
        DATABASE_URL: testUrl,
        JWT_SECRET: validSecret,
        NODE_ENV: 'prodution',
      }),
    ).toThrow('NODE_ENV must be development, test, or production')
  })

  it('accepts exact authentication retention minima', () => {
    const env = {
      DATABASE_URL: testUrl,
      JWT_SECRET: validSecret,
      AUTH_OTP_RETENTION_SECONDS: '86400',
      AUTH_SESSION_RETENTION_SECONDS: '2592000',
    }

    expect(loadConfig(env).auth).toMatchObject({
      otpRetentionSeconds: 86_400,
      sessionRetentionSeconds: 2_592_000,
    })
    expect(loadCleanupConfig(env)).toMatchObject({
      otpRetentionSeconds: 86_400,
      sessionRetentionSeconds: 2_592_000,
    })
  })

  it.each([
    ['AUTH_OTP_RETENTION_SECONDS', '86399', '86400'],
    ['AUTH_SESSION_RETENTION_SECONDS', '2591999', '2592000'],
  ])('rejects %s below its security minimum', (name, value, minimum) => {
    const env = {
      DATABASE_URL: testUrl,
      JWT_SECRET: validSecret,
      [name]: value,
    }

    expect(() => loadConfig(env)).toThrow(`${name} must be at least ${minimum}`)
    expect(() => loadCleanupConfig(env)).toThrow(
      `${name} must be at least ${minimum}`,
    )
  })

  it('rejects OTP retention below any configured request window', () => {
    const env = {
      DATABASE_URL: testUrl,
      JWT_SECRET: validSecret,
      AUTH_PHONE_WINDOW_SECONDS: '86401',
      AUTH_OTP_RETENTION_SECONDS: '86400',
    }

    expect(() => loadConfig(env)).toThrow(
      'AUTH_OTP_RETENTION_SECONDS must be at least 86401',
    )
    expect(() => loadCleanupConfig(env)).toThrow(
      'AUTH_OTP_RETENTION_SECONDS must be at least 86401',
    )
  })

  it('accepts OTP retention at an extended request-window boundary', () => {
    const env = {
      DATABASE_URL: testUrl,
      JWT_SECRET: validSecret,
      AUTH_PHONE_WINDOW_SECONDS: '86401',
      AUTH_OTP_RETENTION_SECONDS: '86401',
    }

    expect(loadConfig(env).auth.otpRetentionSeconds).toBe(86_401)
    expect(loadCleanupConfig(env).otpRetentionSeconds).toBe(86_401)
  })

  it.each(['DATABASE_URL', 'JWT_SECRET'] as const)(
    'rejects a missing %s',
    (missing) => {
      const env: NodeJS.ProcessEnv = {
        DATABASE_URL: 'postgres://localhost/movilis',
        JWT_SECRET: validSecret,
      }
      delete env[missing]
      expect(() => loadConfig(env)).toThrow(`${missing} is required`)
    },
  )

  it('rejects an invalid positive integer', () => {
    expect(() =>
      loadConfig({
        DATABASE_URL: 'postgres://localhost/movilis',
        JWT_SECRET: validSecret,
        PORT: '0',
      }),
    ).toThrow('PORT must be a positive integer')
  })

  it.each([
    'ACCESS_TOKEN_TTL_SECONDS',
    'REFRESH_TOKEN_TTL_SECONDS',
    'OTP_TTL_SECONDS',
    'AUTH_RESEND_COOLDOWN_SECONDS',
    'AUTH_PHONE_WINDOW_SECONDS',
    'AUTH_PHONE_WINDOW_MAX_REQUESTS',
    'AUTH_IP_WINDOW_SECONDS',
    'AUTH_IP_WINDOW_MAX_REQUESTS',
    'AUTH_DEVICE_WINDOW_SECONDS',
    'AUTH_DEVICE_WINDOW_MAX_REQUESTS',
    'AUTH_MAX_OTP_ATTEMPTS',
    'AUTH_OTP_RETENTION_SECONDS',
    'AUTH_SESSION_RETENTION_SECONDS',
    'AUTH_CLEANUP_BATCH_SIZE',
    'TWILIO_TIMEOUT_MS',
  ])('rejects a non-positive %s', (name) => {
    expect(() =>
      loadConfig({
        DATABASE_URL: testUrl,
        JWT_SECRET: validSecret,
        [name]: '0',
      }),
    ).toThrow(`${name} must be a positive integer`)
  })

  it.each([
    ['31 UTF-8 bytes', 'a'.repeat(31)],
    ['the documented placeholder', 'replace-with-a-long-random-secret'],
  ])('rejects JWT_SECRET with %s', (_case, jwtSecret) => {
    expect(() =>
      loadConfig({
        DATABASE_URL: 'postgres://localhost/movilis',
        JWT_SECRET: jwtSecret,
      }),
    ).toThrow('JWT_SECRET must be at least 32 UTF-8 bytes and not a placeholder')
  })

  it('measures JWT_SECRET length in UTF-8 bytes', () => {
    expect(
      loadConfig({
        DATABASE_URL: 'postgres://localhost/movilis',
        JWT_SECRET: 'é'.repeat(16),
      }).jwtSecret,
    ).toBe('é'.repeat(16))
  })

  it.each(['OTP_CODE_HMAC_SECRET', 'AUTH_RATE_LIMIT_HMAC_SECRET'] as const)(
    'rejects a short production %s',
    (name) => {
      expect(() => loadConfig({ ...productionEnv(), [name]: 'a'.repeat(31) })).toThrow(
        `${name} must be at least 32 UTF-8 bytes and not a placeholder`,
      )
    },
  )

  it.each(
    ['OTP_CODE_HMAC_SECRET', 'AUTH_RATE_LIMIT_HMAC_SECRET'].flatMap((name) =>
      [
        'replace-me',
        'change-me',
        'replace-with-a-long-random-secret',
        'REPLACE-WITH-A-LONG-RANDOM-SECRET',
      ].map((value) => [name, value] as const),
    ),
  )('rejects placeholder %s value %s in production', (name, value) => {
    expect(() => loadConfig({ ...productionEnv(), [name]: value })).toThrow(
      `${name} must be at least 32 UTF-8 bytes and not a placeholder`,
    )
  })

  it('measures production HMAC secret length in UTF-8 bytes', () => {
    const otpSecret = 'é'.repeat(16)
    const rateSecret = 'ñ'.repeat(16)
    const config = loadConfig({
      ...productionEnv(),
      OTP_CODE_HMAC_SECRET: otpSecret,
      AUTH_RATE_LIMIT_HMAC_SECRET: rateSecret,
    })

    expect(config.auth).toMatchObject({
      otpCodeHmacSecret: otpSecret,
      rateLimitHmacSecret: rateSecret,
    })
  })

  it('rejects development OTP exposure in production', () => {
    expect(() =>
      loadConfig({
        DATABASE_URL: 'postgres://localhost/movilis',
        JWT_SECRET: validSecret,
        NODE_ENV: 'production',
        AUTH_EXPOSE_DEV_OTP_CODE: 'true',
      }),
    ).toThrow('AUTH_EXPOSE_DEV_OTP_CODE cannot be enabled in production')
  })

  it('requires distinct OTP and rate-limit HMAC secrets in production', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        DATABASE_URL: testUrl,
        JWT_SECRET: validSecret,
        OTP_CODE_HMAC_SECRET: 'same',
        AUTH_RATE_LIMIT_HMAC_SECRET: 'same',
      }),
    ).toThrow('OTP and rate-limit HMAC secrets must differ')
  })

  it('rejects an OTP HMAC secret equal to the JWT secret in production', () => {
    expect(() =>
      loadConfig({
        ...productionEnv(),
        OTP_CODE_HMAC_SECRET: validSecret,
      }),
    ).toThrow('OTP_CODE_HMAC_SECRET must differ from JWT_SECRET')
  })

  it('rejects a rate-limit HMAC secret equal to the JWT secret in production', () => {
    expect(() =>
      loadConfig({
        ...productionEnv(),
        AUTH_RATE_LIMIT_HMAC_SECRET: validSecret,
      }),
    ).toThrow('AUTH_RATE_LIMIT_HMAC_SECRET must differ from JWT_SECRET')
  })

  it.each([
    'OTP_CODE_HMAC_SECRET',
    'AUTH_RATE_LIMIT_HMAC_SECRET',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
  ])('requires %s in production', (missing) => {
    const env: NodeJS.ProcessEnv = productionEnv()
    delete env[missing]

    expect(() => loadConfig(env)).toThrow(`${missing} is required`)
  })

  it('requires one Twilio sender in production', () => {
    const env = productionEnv()
    delete env.TWILIO_FROM_NUMBER

    expect(() => loadConfig(env)).toThrow(
      'Exactly one of TWILIO_FROM_NUMBER and TWILIO_MESSAGING_SERVICE_SID is required',
    )
  })

  it('rejects two Twilio senders in production', () => {
    expect(() =>
      loadConfig({
        ...productionEnv(),
        TWILIO_MESSAGING_SERVICE_SID: 'MG123',
      }),
    ).toThrow(
      'Exactly one of TWILIO_FROM_NUMBER and TWILIO_MESSAGING_SERVICE_SID is required',
    )
  })
})

function productionEnv(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    DATABASE_URL: testUrl,
    JWT_SECRET: validSecret,
    OTP_CODE_HMAC_SECRET: 'otp-production-secret-that-is-32-bytes',
    AUTH_RATE_LIMIT_HMAC_SECRET: 'rate-production-secret-that-is-32-bytes',
    TWILIO_ACCOUNT_SID: 'AC123',
    TWILIO_AUTH_TOKEN: 'token',
    TWILIO_FROM_NUMBER: '+15555550123',
  }
}
