import { describe, expect, it } from 'vitest'
import * as v from 'valibot'

import * as shared from '../src/index.js'

describe('@movilis/shared public exports', () => {
  it('exports every runtime schema and endpoint contract', () => {
    const expectedExports = [
      'apiErrorCodeSchema',
      'apiErrorSchema',
      'authSessionSchema',
      'completeSignupBodySchema',
      'completeSignupContract',
      'completeSignupRequestSchema',
      'completeSignupResponseSchema',
      'createTripBodySchema',
      'createTripContract',
      'createTripRequestSchema',
      'createTripResponseSchema',
      'cursorPageSchema',
      'cursorSchema',
      'getMeContract',
      'getMeResponseSchema',
      'getUserByIdContract',
      'getUserByIdParamsSchema',
      'getUserByIdResponseSchema',
      'idSchema',
      'listMyTripsContract',
      'listMyTripsResponseSchema',
      'logoutBodySchema',
      'logoutContract',
      'logoutRequestSchema',
      'logoutResponseSchema',
      'moneySchema',
      'ownedTripPageSchema',
      'ownedTripSchema',
      'phoneNumberSchema',
      'privateUserSchema',
      'publicUserSchema',
      'refreshBodySchema',
      'refreshContract',
      'refreshRequestSchema',
      'refreshResponseSchema',
      'requestOtpBodySchema',
      'requestOtpContract',
      'requestOtpRequestSchema',
      'requestOtpResponseSchema',
      'timestampSchema',
      'timestampWithOffsetPattern',
      'tripStatusSchema',
      'userIdParamsSchema',
      'validationFieldSchema',
      'verifyOtpBodySchema',
      'verifyOtpContract',
      'verifyOtpRequestSchema',
      'verifyOtpResponseSchema',
    ]

    expect(Object.keys(shared).sort()).toEqual(expectedExports)
  })

  it('parses an endpoint response through the package barrel', () => {
    expect(
      v.parse(shared.requestOtpResponseSchema, { expiresInSeconds: 600 }),
    ).toEqual({ expiresInSeconds: 600 })
  })

  it('does not retain the legacy response envelope at runtime', () => {
    const legacyExport = ['Api', 'Response'].join('')

    expect(legacyExport in shared).toBe(false)
  })
})
