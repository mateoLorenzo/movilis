import { describe, expect, it } from 'vitest'

import { loadConfig } from '../config.js'

describe('loadConfig', () => {
  it('parses explicit process configuration', () => {
    expect(
      loadConfig({
        DATABASE_URL: 'postgres://localhost/movilis',
        JWT_SECRET: 'test-secret',
        PORT: '9090',
        AUTH_EXPOSE_DEV_OTP_CODE: 'true',
        ACCESS_TOKEN_TTL_SECONDS: '60',
        REFRESH_TOKEN_TTL_SECONDS: '120',
        OTP_TTL_SECONDS: '30',
      }),
    ).toEqual({
      databaseUrl: 'postgres://localhost/movilis',
      jwtSecret: 'test-secret',
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
        JWT_SECRET: 'test-secret',
      }
      delete env[missing]
      expect(() => loadConfig(env)).toThrow(`${missing} is required`)
    },
  )

  it('rejects an invalid positive integer', () => {
    expect(() =>
      loadConfig({
        DATABASE_URL: 'postgres://localhost/movilis',
        JWT_SECRET: 'test-secret',
        PORT: '0',
      }),
    ).toThrow('PORT must be a positive integer')
  })
})
