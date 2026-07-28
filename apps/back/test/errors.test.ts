import type { Db } from '@movilis/db'
import { apiErrorSchema } from '@movilis/shared'
import type { FastifyInstance, FastifyServerOptions } from 'fastify'
import { safeParse } from 'valibot'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildApp } from '../app.js'
import { AppError, safeErrorType } from '../errors.js'
import type { SmsSender } from '../modules/auth/sms.sender.js'
import { createTestAuthConfig } from './auth-config.js'

const smsSender = {
  sendOtp: vi.fn(async () => ({ providerMessageId: 'test' })),
} satisfies SmsSender

describe('canonical error handling', () => {
  const apps: FastifyInstance[] = []

  async function createTestApp(logger: FastifyServerOptions['logger'] = false) {
    const app = await buildApp({
      db: {} as Db,
      jwtSecret: 'test-secret',
      authConfig: createTestAuthConfig(),
      smsSender,
      trustedProxies: [],
      logger,
    })
    apps.push(app)
    return app
  }

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()))
  })

  it('classifies errors into a closed set of safe categories', () => {
    expect(safeErrorType(new AppError('NOT_FOUND', 'safe'))).toBe('AppError')
    expect(safeErrorType(new Error('safe'))).toBe('Error')
    expect(safeErrorType({ name: 'attacker-controlled' })).toBe('UnknownError')
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

  it.each([
    ['SMS_DELIVERY_FAILED', 503],
    ['OTP_SUPERSEDED', 409],
  ] as const)('maps %s to HTTP %i', async (code, statusCode) => {
    const app = await createTestApp()
    app.get('/mapped-error', async () => {
      throw new AppError(code, 'Safe message')
    })

    const response = await app.inject({ method: 'GET', url: '/mapped-error' })

    expect(response.statusCode).toBe(statusCode)
    expect(response.json()).toMatchObject({ code, message: 'Safe message' })
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

  it('hides unexpected exception details and logs safe error metadata', async () => {
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

  it('redacts auth and provider secrets from serialized Fastify logs', async () => {
    const lines: string[] = []
    const app = await createTestApp({
      level: 'info',
      stream: { write: (line: string) => lines.push(line) },
      serializers: {
        req: () => ({ leaked: 'malicious-request-serializer' }),
        res: () => ({ leaked: 'malicious-response-serializer' }),
        err: () => ({
          type: 'malicious-error-serializer',
          message: 'malicious-error-serializer',
          stack: 'malicious-error-serializer',
        }),
      },
    })
    const secrets = {
      otp: '839201',
      phone: '+15555550123',
      forwardedIp: '203.0.113.77',
      socketIp: '127.0.0.1',
      deviceId: 'private-device-id',
      twilioToken: 'twilio-auth-secret',
      accessToken: 'access-token-secret',
      refreshToken: 'refresh-token-secret',
      providerMessageId: 'SM-private-provider-id',
    }
    const headers = {
      authorization: `Bearer ${secrets.accessToken}`,
      'x-device-id': secrets.deviceId,
      'x-forwarded-for': secrets.forwardedIp,
    }

    app.post('/provider-error', async () => {
      try {
        throw new Error(
          `provider token=${secrets.twilioToken} sid=${secrets.providerMessageId}`,
        )
      } catch {
        throw new AppError('SMS_DELIVERY_FAILED', 'SMS delivery failed')
      }
    })
    app.get('/nested-unexpected', async (request) => {
      const cause = Object.assign(
        new Error(
          `otp=${secrets.otp} phone=${secrets.phone} ip=${secrets.forwardedIp}`,
        ),
        {
          deviceId: secrets.deviceId,
          authToken: secrets.twilioToken,
          providerMessageId: secrets.providerMessageId,
        },
      )
      const error = new Error(
        `access=${secrets.accessToken} refresh=${secrets.refreshToken}`,
        { cause },
      )
      error.name = Object.values(secrets).join(':')
      request.log.error({ err: error }, 'Serializer probe')
      throw error
    })

    const providerResponse = await app.inject({
      method: 'POST',
      url: '/provider-error',
      headers,
      payload: {
        phoneNumber: secrets.phone,
        code: secrets.otp,
        refreshToken: secrets.refreshToken,
      },
    })
    const validationResponse = await app.inject({
      method: 'POST',
      url: '/auth/otp/request',
      headers,
      payload: { phoneNumber: `${secrets.phone}-invalid`, code: secrets.otp },
    })
    const unexpectedResponse = await app.inject({
      method: 'GET',
      url: '/nested-unexpected',
      headers,
    })

    expect(providerResponse.statusCode).toBe(503)
    expect(validationResponse.statusCode).toBe(400)
    expect(unexpectedResponse.statusCode).toBe(500)
    const serializedLogs = lines.join('')
    expect(serializedLogs).toContain('incoming request')
    expect(serializedLogs).toContain('request completed')
    expect(serializedLogs).toContain('Unhandled request error')
    expect(serializedLogs).not.toContain('malicious-request-serializer')
    expect(serializedLogs).not.toContain('malicious-response-serializer')
    expect(serializedLogs).not.toContain('malicious-error-serializer')
    for (const secret of Object.values(secrets)) {
      expect(serializedLogs).not.toContain(secret)
    }
    const unhandledLog = lines
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .find((line) => line.msg === 'Unhandled request error')
    expect(unhandledLog).toMatchObject({
      reqId: expect.any(String),
      requestId: expect.any(String),
      errorType: 'Error',
    })
    expect(unhandledLog?.requestId).toBe(unhandledLog?.reqId)
    const serializerLog = lines
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .find((line) => line.msg === 'Serializer probe')
    expect(serializerLog).toMatchObject({
      reqId: expect.any(String),
      err: { type: 'Error', message: 'Redacted error', stack: '' },
    })
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
