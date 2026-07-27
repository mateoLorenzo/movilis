import {
  apiErrorSchema,
  completeSignupRequestSchema,
  completeSignupResponseSchema,
  createTripRequestSchema,
  createTripResponseSchema,
  getMeResponseSchema,
  getUserByIdParamsSchema,
  getUserByIdResponseSchema,
  listMyTripsResponseSchema,
  logoutRequestSchema,
  refreshRequestSchema,
  refreshResponseSchema,
  requestOtpRequestSchema,
  requestOtpResponseSchema,
  timestampSchema,
  timestampWithOffsetPattern,
  verifyOtpRequestSchema,
  verifyOtpResponseSchema,
} from '@movilis/shared'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import {
  completeSignupSchema,
  logoutSchema,
  meSchema,
  refreshSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from '../modules/auth/auth.schemas.js'
import {
  createTripSchema,
  listMyTripsSchema,
} from '../modules/trips/trips.schemas.js'
import { getUserByIdSchema } from '../modules/users/users.schema.js'
import { errorResponses, toFastifySchema } from '../schemas.js'

describe('schema adapter', () => {
  it('uses JSON Schema date-time for shared timestamps', () => {
    expect(toFastifySchema(timestampSchema)).toMatchObject({
      type: 'string',
      format: 'date-time',
    })
  })

  it('preserves representable shared request constraints', () => {
    expect(toFastifySchema(requestOtpRequestSchema)).toMatchObject({
      additionalProperties: false,
      properties: {
        phoneNumber: { pattern: '^\\+[1-9]\\d{7,14}$' },
      },
    })
    expect(toFastifySchema(createTripRequestSchema)).toMatchObject({
      additionalProperties: false,
      properties: {
        departureAt: {
          pattern: timestampWithOffsetPattern.source,
          format: 'date-time',
        },
        totalSeats: { type: 'integer', minimum: 1, maximum: 8 },
      },
    })
  })

  it('rejects unsupported actions outside the explicit adapter allowlist', () => {
    expect(() =>
      toFastifySchema(v.pipe(v.string(), v.creditCard())),
    ).toThrow(/credit.?card/i)
  })

  it('uses the canonical shared error schema for every error status', () => {
    const expected = toFastifySchema(apiErrorSchema)
    expect(errorResponses).toEqual({
      400: expected,
      401: expected,
      403: expected,
      404: expected,
      409: expected,
      429: expected,
      500: expected,
    })
  })

  it('adapts the shared contracts for every existing route', () => {
    expect(requestOtpSchema).toMatchObject({
      body: toFastifySchema(requestOtpRequestSchema),
      response: { 200: toFastifySchema(requestOtpResponseSchema) },
    })
    expect(verifyOtpSchema).toMatchObject({
      body: toFastifySchema(verifyOtpRequestSchema),
      response: { 200: toFastifySchema(verifyOtpResponseSchema) },
    })
    expect(completeSignupSchema).toMatchObject({
      body: toFastifySchema(completeSignupRequestSchema),
      response: { 200: toFastifySchema(completeSignupResponseSchema) },
    })
    expect(refreshSchema).toMatchObject({
      body: toFastifySchema(refreshRequestSchema),
      response: { 200: toFastifySchema(refreshResponseSchema) },
    })
    expect(logoutSchema.body).toEqual(toFastifySchema(logoutRequestSchema))
    expect(meSchema.response[200]).toEqual(toFastifySchema(getMeResponseSchema))
    expect(createTripSchema).toMatchObject({
      body: toFastifySchema(createTripRequestSchema),
      response: { 201: toFastifySchema(createTripResponseSchema) },
    })
    expect(listMyTripsSchema.response[200]).toEqual(
      toFastifySchema(listMyTripsResponseSchema),
    )
    expect(getUserByIdSchema).toMatchObject({
      params: toFastifySchema(getUserByIdParamsSchema),
      response: { 200: toFastifySchema(getUserByIdResponseSchema) },
    })
  })

  it('declares canonical error responses for every existing route', () => {
    const routeSchemas = [
      requestOtpSchema,
      verifyOtpSchema,
      completeSignupSchema,
      refreshSchema,
      logoutSchema,
      meSchema,
      createTripSchema,
      listMyTripsSchema,
      getUserByIdSchema,
    ]

    for (const schema of routeSchemas) {
      expect(schema.response).toMatchObject(errorResponses)
    }
  })
})
