import type { Db } from '@movilis/db'
import { apiErrorSchema } from '@movilis/shared'
import { safeParse } from 'valibot'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildApp } from '../app.js'
import { AppError } from '../errors.js'

describe('canonical error handling', () => {
  const apps: Awaited<ReturnType<typeof createTestApp>>[] = []

  async function createTestApp() {
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
    return app
  }

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()))
  })

  it('serializes a domain error', async () => {
    const app = await createTestApp()
    app.get('/domain-error', async () => {
      throw new AppError('CITY_NOT_FOUND', 404, 'City not found')
    })

    const response = await app.inject({ method: 'GET', url: '/domain-error' })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({
      code: 'CITY_NOT_FOUND',
      message: 'City not found',
      requestId: response.headers['x-request-id'],
    })
    expect(safeParse(apiErrorSchema, response.json()).success).toBe(true)
  })

  it('hides unexpected exception details and logs the original error', async () => {
    const app = await createTestApp()
    const log = vi.spyOn(app.log, 'error')
    app.get('/unexpected', async () => {
      throw new Error('password=secret sql=select')
    })

    const response = await app.inject({ method: 'GET', url: '/unexpected' })
    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId: response.headers['x-request-id'],
    })
    expect(response.body).not.toContain('password=secret')
    expect(response.body).not.toContain('sql=select')
    expect(log).toHaveBeenCalledOnce()
  })

  it('returns a canonical missing-route response', async () => {
    const app = await createTestApp()
    const response = await app.inject({ method: 'GET', url: '/absent' })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Resource not found',
    })
  })
})
