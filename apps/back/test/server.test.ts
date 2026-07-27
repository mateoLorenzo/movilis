import type { Db } from '@movilis/db'
import { describe, expect, it, vi } from 'vitest'

import { buildApp } from '../app.js'
import type { AppConfig } from '../config.js'
import { startServer } from '../server.js'

const config: AppConfig = {
  databaseUrl: 'postgres://localhost/movilis',
  jwtSecret: 'test-secret',
  port: 8080,
  auth: {
    accessTokenTtlSeconds: 60,
    refreshTokenTtlSeconds: 120,
    otpTtlSeconds: 30,
    exposeDevOtpCode: false,
  },
}

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
      }),
    ).rejects.toThrow('listen failed')

    expect(closeApp).toHaveBeenCalledTimes(1)
    expect(closeDatabase).toHaveBeenCalledTimes(1)
  })
})
