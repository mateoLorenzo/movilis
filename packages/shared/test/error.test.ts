import { describe, expect, it } from 'vitest'
import * as v from 'valibot'

import {
  apiErrorCodeSchema,
  apiErrorSchema,
} from '../src/primitives/error.js'

const commonCodes = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const

const domainCodes = [
  'INVALID_OTP',
  'INVALID_ONBOARDING_TOKEN',
  'INVALID_REFRESH_TOKEN',
  'USER_ALREADY_EXISTS',
  'CITY_NOT_FOUND',
  'USER_NOT_FOUND',
  'INVALID_DEPARTURE_TIME',
  'SMS_DELIVERY_FAILED',
  'OTP_SUPERSEDED',
] as const

describe('apiErrorSchema', () => {
  it.each(['SMS_DELIVERY_FAILED', 'OTP_SUPERSEDED'] as const)(
    'parses authentication error code %s directly',
    (code) => {
      expect(v.parse(apiErrorCodeSchema, code)).toBe(code)
    },
  )

  it.each([...commonCodes, ...domainCodes])('accepts declared code %s', (code) => {
    expect(
      v.parse(apiErrorSchema, {
        code,
        message: 'Fallback message',
        requestId: 'req-123',
      }),
    ).toEqual({ code, message: 'Fallback message', requestId: 'req-123' })
  })

  it('accepts field validation details', () => {
    const error = {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      requestId: 'req-123',
      details: {
        fields: [
          {
            path: 'body.phoneNumber',
            message: 'Phone number must be in E.164 format',
          },
        ],
      },
    }

    expect(v.parse(apiErrorSchema, error)).toEqual(error)
  })

  it.each([
    { code: 'UNKNOWN_ERROR', message: 'No', requestId: 'req-1' },
    { code: 'NOT_FOUND', message: '', requestId: 'req-1' },
    { code: 'NOT_FOUND', message: 'Missing', requestId: '' },
    {
      code: 'VALIDATION_ERROR',
      message: 'Invalid',
      requestId: 'req-1',
      details: { reason: 'arbitrary' },
    },
    {
      code: 'VALIDATION_ERROR',
      message: 'Invalid',
      requestId: 'req-1',
      details: { fields: [{ path: '', message: 'Invalid' }] },
    },
  ])('rejects a non-canonical error shape %#', (error) => {
    expect(v.safeParse(apiErrorSchema, error).success).toBe(false)
  })
})
