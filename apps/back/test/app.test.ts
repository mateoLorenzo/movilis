import type { Db } from '@movilis/db'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildApp } from '../app.js'

describe('buildApp', () => {
  const apps: Awaited<ReturnType<typeof buildApp>>[] = []

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()))
  })

  it('registers the app without opening a listening socket', async () => {
    const app = await buildApp({
      db: {} as Db,
      jwtSecret: 'test-secret',
      authConfig: {
        accessTokenTtlSeconds: 60,
        refreshTokenTtlSeconds: 120,
        otpTtlSeconds: 30,
        exposeDevOtpCode: true,
      },
      logger: false,
    })
    apps.push(app)
    const listen = vi.spyOn(app, 'listen')

    await app.ready()

    expect(listen).not.toHaveBeenCalled()
    expect(app.server.listening).toBe(false)
  })

  it('uses injected auth configuration in OTP endpoint behavior', async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: async () => [{ requestCount: 0 }],
        }),
      }),
      insert: () => ({ values: async () => undefined }),
    } as unknown as Db
    const app = await buildApp({
      db,
      jwtSecret: 'test-secret',
      authConfig: {
        accessTokenTtlSeconds: 60,
        refreshTokenTtlSeconds: 120,
        otpTtlSeconds: 37,
        exposeDevOtpCode: true,
      },
      logger: false,
    })
    apps.push(app)

    const response = await app.inject({
      method: 'POST',
      url: '/auth/otp/request',
      payload: { phoneNumber: '+15555550123' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      expiresInSeconds: 37,
      devCode: expect.stringMatching(/^\d{6}$/),
    })
  })
})
