import type { Db } from '@movilis/db'
import { describe, expect, it, vi } from 'vitest'

import { buildApp } from '../app.js'
import type { AppConfig } from '../config.js'
import { developmentSmsSender } from '../modules/auth/development.sms-sender.js'
import type { SmsSender } from '../modules/auth/sms.sender.js'
import { startServer } from '../server.js'
import { createTestAuthConfig } from './auth-config.js'

const config: AppConfig = {
  databaseUrl: 'postgres://localhost/movilis',
  jwtSecret: 'test-secret',
  nodeEnv: 'development',
  port: 8080,
  trustedProxies: ['127.0.0.1'],
  auth: createTestAuthConfig({ exposeDevOtpCode: false }),
  sms: {
    accountSid: undefined,
    authToken: undefined,
    fromNumber: undefined,
    messagingServiceSid: undefined,
    timeoutMs: 10_000,
  },
}

const unusedTwilioFactory = vi.fn(() => developmentSmsSender)

describe('startServer', () => {
  it('closes the database once when app construction fails', async () => {
    const closeDatabase = vi.fn(async () => undefined)

    await expect(
      startServer(config, {
        createDatabase: vi.fn(async () => ({
          db: {} as Db,
          close: closeDatabase,
        })),
        buildApp: vi.fn(async () => {
          throw new Error('construction failed')
        }),
        createTwilioSmsSender: unusedTwilioFactory,
      }),
    ).rejects.toThrow('construction failed')

    expect(closeDatabase).toHaveBeenCalledTimes(1)
  })

  it('closes the app and database once when listening fails', async () => {
    const closeDatabase = vi.fn(async () => undefined)
    let closeApp: ReturnType<typeof vi.spyOn> | undefined

    await expect(
      startServer(config, {
        createDatabase: vi.fn(async () => ({
          db: {} as Db,
          close: closeDatabase,
        })),
        buildApp: async (options) => {
          const app = await buildApp({ ...options, logger: false })
          vi.spyOn(app, 'listen').mockRejectedValue(new Error('listen failed'))
          closeApp = vi.spyOn(app, 'close')
          return app
        },
        createTwilioSmsSender: unusedTwilioFactory,
      }),
    ).rejects.toThrow('listen failed')

    expect(closeApp).toHaveBeenCalledTimes(1)
    expect(closeDatabase).toHaveBeenCalledTimes(1)
  })

  it('injects the development sender outside production', async () => {
    const closeDatabase = vi.fn(async () => undefined)
    const listen = vi.fn(async () => 'http://127.0.0.1:8080')
    const app = { listen, close: vi.fn(), log: { info: vi.fn() } }
    const build = vi.fn(async () => app)
    const createTwilio = vi.fn(() => developmentSmsSender)

    await startServer(config, {
      createDatabase: vi.fn(async () => ({
        db: {} as Db,
        close: closeDatabase,
      })),
      buildApp: build as unknown as typeof buildApp,
      createTwilioSmsSender: createTwilio,
    })

    expect(createTwilio).not.toHaveBeenCalled()
    expect(build).toHaveBeenCalledWith(
      expect.objectContaining({
        smsSender: developmentSmsSender,
        trustedProxies: ['127.0.0.1'],
      }),
    )
    const listenOptions = listen.mock.calls[0]?.[0]
    expect(listenOptions).toMatchObject({ port: 8080, host: '0.0.0.0' })
    expect(listenOptions?.listenTextResolver('http://127.0.0.1:8080')).toBe(
      'Server listening',
    )
    expect(app.log.info).not.toHaveBeenCalled()
  })

  it('creates and injects the Twilio sender in production', async () => {
    const twilioSender = { sendOtp: vi.fn() } satisfies SmsSender
    const createTwilio = vi.fn(() => twilioSender)
    const app = {
      listen: vi.fn(async () => 'http://127.0.0.1:8080'),
      close: vi.fn(),
      log: { info: vi.fn() },
    }
    const build = vi.fn(async () => app)
    const productionConfig: AppConfig = {
      ...config,
      nodeEnv: 'production',
      sms: {
        accountSid: 'AC123',
        authToken: 'auth-token',
        fromNumber: '+15555550100',
        messagingServiceSid: undefined,
        timeoutMs: 5_000,
      },
    }

    await startServer(productionConfig, {
      createDatabase: vi.fn(async () => ({
        db: {} as Db,
        close: vi.fn(async () => undefined),
      })),
      buildApp: build as unknown as typeof buildApp,
      createTwilioSmsSender: createTwilio,
    })

    expect(createTwilio).toHaveBeenCalledWith(productionConfig.sms)
    expect(build).toHaveBeenCalledWith(
      expect.objectContaining({
        smsSender: twilioSender,
        trustedProxies: productionConfig.trustedProxies,
      }),
    )
  })
})
