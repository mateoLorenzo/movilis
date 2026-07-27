import { describe, expect, it } from 'vitest'

import { loadConfig } from '../config.js'

const validSecret = 'a-secure-test-secret-that-is-32-bytes'

describe('loadConfig', () => {
  it('parses explicit process configuration', () => {
    expect(
      loadConfig({
        DATABASE_URL: 'postgres://localhost/movilis',
        JWT_SECRET: validSecret,
        PORT: '9090',
        AUTH_EXPOSE_DEV_OTP_CODE: 'true',
        ACCESS_TOKEN_TTL_SECONDS: '60',
        REFRESH_TOKEN_TTL_SECONDS: '120',
        OTP_TTL_SECONDS: '30',
      }),
    ).toEqual({
      databaseUrl: 'postgres://localhost/movilis',
      jwtSecret: validSecret,
      port: 9090,
      auth: {
        exposeDevOtpCode: true,
        accessTokenTtlSeconds: 60,
        refreshTokenTtlSeconds: 120,
        otpTtlSeconds: 30,
      },
    })
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
})
