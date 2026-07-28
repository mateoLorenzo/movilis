import type { Db } from '@movilis/db'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildApp } from '../app.js'
import type { SmsSender } from '../modules/auth/sms.sender.js'
import { createTestAuthConfig } from './auth-config.js'

const smsSender = {
  sendOtp: vi.fn(async () => ({ providerMessageId: 'test' })),
} satisfies SmsSender

describe('buildApp', () => {
  const apps: Awaited<ReturnType<typeof buildApp>>[] = []

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()))
  })

  it('registers the app without opening a listening socket', async () => {
    const app = await buildApp({
      db: {} as Db,
      jwtSecret: 'test-secret',
      authConfig: createTestAuthConfig(),
      smsSender,
      trustedProxies: [],
      logger: false,
    })
    apps.push(app)
    const listen = vi.spyOn(app, 'listen')

    await app.ready()

    expect(listen).not.toHaveBeenCalled()
    expect(app.server.listening).toBe(false)
  })

  it('decorates the app with the injected SMS sender', async () => {
    const app = await buildApp({
      db: {} as Db,
      jwtSecret: 'test-secret',
      authConfig: createTestAuthConfig(),
      smsSender,
      trustedProxies: [],
      logger: false,
    })
    apps.push(app)

    expect(app.smsSender).toBe(smsSender)
  })

  it('trusts only the configured proxy addresses', async () => {
    const app = await buildApp({
      db: {} as Db,
      jwtSecret: 'test-secret',
      authConfig: createTestAuthConfig(),
      smsSender,
      trustedProxies: ['127.0.0.1'],
      logger: false,
    })
    apps.push(app)
    app.get('/request-ip', async (request) => ({ ip: request.ip }))

    const response = await app.inject({
      method: 'GET',
      url: '/request-ip',
      headers: { 'x-forwarded-for': '203.0.113.10' },
    })

    expect(response.json()).toEqual({ ip: '203.0.113.10' })
  })

  it('ignores forwarded IPs from an untrusted proxy', async () => {
    const app = await buildApp({
      db: {} as Db,
      jwtSecret: 'test-secret',
      authConfig: createTestAuthConfig(),
      smsSender,
      trustedProxies: ['127.0.0.1'],
      logger: false,
    })
    apps.push(app)
    app.get('/request-ip', async (request) => ({ ip: request.ip }))

    const response = await app.inject({
      method: 'GET',
      url: '/request-ip',
      remoteAddress: '198.51.100.1',
      headers: { 'x-forwarded-for': '203.0.113.10' },
    })

    expect(response.json()).toEqual({ ip: '198.51.100.1' })
  })

  it('uses injected auth configuration in OTP endpoint behavior', async () => {
    let insertedValues: unknown
    const updates: unknown[] = []
    const update = () => ({
      set: (values: unknown) => {
        updates.push(values)
        return {
          where: () => {
            const result = Promise.resolve([]) as Promise<never[]> & {
              returning: () => Promise<{ id: string }[]>
            }
            result.returning = async () => [{ id: 'challenge' }]
            return result
          },
        }
      },
    })
    const tx = {
      execute: async () => undefined,
      select: (selection: Record<string, unknown>) => ({
        from: () => ({
          where: () => {
            if ('status' in selection) {
              return {
                for: async () => [
                  {
                    status: 'pending',
                    expiresAt: (insertedValues as { expiresAt: Date }).expiresAt,
                  },
                ],
              }
            }
            return Promise.resolve([{ requestCount: 0 }])
          },
        }),
      }),
      insert: () => ({
        values: async (values: unknown) => {
          insertedValues = values
        },
      }),
      update,
    }
    const db = {
      ...tx,
      transaction: async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
    } as unknown as Db
    const app = await buildApp({
      db,
      jwtSecret: 'test-secret',
      authConfig: createTestAuthConfig({
        otpTtlSeconds: 37,
        resendCooldownSeconds: 41,
      }),
      smsSender,
      trustedProxies: [],
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
      resendAfterSeconds: 41,
      devCode: expect.stringMatching(/^\d{6}$/),
    })
    expect(insertedValues).toMatchObject({
      purpose: 'login',
      status: 'pending',
      identifierHash: expect.not.stringContaining('+15555550123'),
    })
    expect(updates).toContainEqual(
      expect.objectContaining({
        status: 'deliverable',
        providerMessageId: 'test',
      }),
    )
  })
})
