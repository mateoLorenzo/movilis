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
      throw new AppError('CITY_NOT_FOUND', 'City not found')
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

  it('serializes Fastify validation errors with field-only details', async () => {
    const app = await createTestApp()
    const response = await app.inject({
      method: 'POST',
      url: '/auth/otp/request',
      payload: {},
    })
    const body = response.json()

    expect(response.statusCode).toBe(400)
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      requestId: response.headers['x-request-id'],
      details: {
        fields: [
          {
            path: 'body.phoneNumber',
            message: expect.any(String),
          },
        ],
      },
    })
    expect(Object.keys(body.details)).toEqual(['fields'])
    expect(Object.keys(body.details.fields[0]).sort()).toEqual([
      'message',
      'path',
    ])
    expect(safeParse(apiErrorSchema, body).success).toBe(true)
  })

  it.each([
    {
      name: 'malformed JSON',
      headers: { 'content-type': 'application/json' },
      payload: '{"phoneNumber":',
      secret: 'phoneNumber',
    },
    {
      name: 'unsupported content type',
      headers: { 'content-type': 'application/xml' },
      payload: 'private request body',
      secret: 'private request body',
    },
    {
      name: 'an oversized body',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ secret: 'x'.repeat(1_050_000) }),
      secret: 'xxxxxxxxxxxxxxxx',
    },
  ])('maps $name to a fixed canonical client error', async ({ headers, payload, secret }) => {
    const app = await createTestApp()
    const response = await app.inject({
      method: 'POST',
      url: '/auth/otp/request',
      headers,
      payload,
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      requestId: response.headers['x-request-id'],
    })
    expect(response.body).not.toContain(secret)
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
