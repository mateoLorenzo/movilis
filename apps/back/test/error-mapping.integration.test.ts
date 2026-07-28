import type { ApiErrorCode } from '@movilis/shared'
import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AppError } from '../errors.js'
import { createIntegrationApp } from './fixtures.js'

describe.sequential('central status and code mapping', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await createIntegrationApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it.each([
    ['VALIDATION_ERROR', 400, 'Request validation failed'],
    ['UNAUTHENTICATED', 401, 'Authentication required'],
    ['FORBIDDEN', 403, 'Forbidden'],
    ['NOT_FOUND', 404, 'Resource not found'],
    ['CONFLICT', 409, 'Resource conflict'],
    ['RATE_LIMITED', 429, 'Too many OTP requests. Try again later.'],
    ['INTERNAL_ERROR', 500, 'An unexpected error occurred'],
    ['INVALID_OTP', 401, 'Invalid or expired OTP code'],
    ['INVALID_ONBOARDING_TOKEN', 401, 'Invalid onboarding token'],
    ['INVALID_REFRESH_TOKEN', 401, 'Invalid refresh token'],
    ['USER_ALREADY_EXISTS', 409, 'User already exists'],
    ['CITY_NOT_FOUND', 404, 'City not found'],
    ['USER_NOT_FOUND', 404, 'User not found'],
    ['INVALID_DEPARTURE_TIME', 400, 'Departure date must be in the future'],
    ['SMS_DELIVERY_FAILED', 503, 'SMS delivery failed'],
    ['OTP_SUPERSEDED', 409, 'OTP request was superseded'],
  ] satisfies Array<[ApiErrorCode, number, string]>)(
    '%s maps to HTTP %i',
    async (code, statusCode, message) => {
      const path = `/mapping/${code}`
      app.get(path, async () => {
        throw new AppError(code, message)
      })
      const response = await app.inject({ method: 'GET', url: path })
      expect(response.statusCode).toBe(statusCode)
      expect(response.json()).toEqual({
        code,
        message,
        requestId: response.headers['x-request-id'],
      })
    },
  )
})
