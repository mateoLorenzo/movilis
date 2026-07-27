import { describe, expect, it } from 'vitest'
import * as v from 'valibot'

import {
  authSessionSchema,
  completeSignupBodySchema,
  completeSignupContract,
  completeSignupRequestSchema,
  completeSignupResponseSchema,
  logoutContract,
  logoutBodySchema,
  logoutRequestSchema,
  logoutResponseSchema,
  refreshContract,
  refreshBodySchema,
  refreshRequestSchema,
  refreshResponseSchema,
  requestOtpContract,
  requestOtpBodySchema,
  requestOtpRequestSchema,
  requestOtpResponseSchema,
  verifyOtpContract,
  verifyOtpBodySchema,
  verifyOtpRequestSchema,
  verifyOtpResponseSchema,
} from '../src/contracts/auth.js'
import { getMeContract } from '../src/contracts/users.js'
import { apiErrorSchema } from '../src/primitives/error.js'

const privateUser = {
  id: 'user-1',
  fullName: 'Ada Lovelace',
  profilePhotoUrl: null,
  ratingAverage: 0,
  ratingCount: 0,
  phoneNumber: '+541140392404',
  cityId: 'city-1',
}

const authSession = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: privateUser,
}

describe('POST /auth/otp/request', () => {
  it('validates its request and both allowed response forms', () => {
    expect(
      v.parse(requestOtpRequestSchema, { phoneNumber: '+541140392404' }),
    ).toEqual({ phoneNumber: '+541140392404' })
    expect(v.parse(requestOtpResponseSchema, { expiresInSeconds: 600 })).toEqual({
      expiresInSeconds: 600,
    })
    expect(
      v.parse(requestOtpResponseSchema, {
        expiresInSeconds: 600,
        devCode: '123456',
      }),
    ).toEqual({ expiresInSeconds: 600, devCode: '123456' })
  })

  it.each([
    { phoneNumber: '1140392404' },
    { phoneNumber: '+541140392404', extra: true },
  ])('rejects invalid request %#', (request) => {
    expect(v.safeParse(requestOtpRequestSchema, request).success).toBe(false)
  })

  it.each([
    { expiresInSeconds: 0 },
    { expiresInSeconds: 600.5 },
    { expiresInSeconds: 600, devCode: '12345' },
  ])('rejects invalid response %#', (response) => {
    expect(v.safeParse(requestOtpResponseSchema, response).success).toBe(false)
  })
})

describe('POST /auth/otp/verify', () => {
  it('validates the request and authenticated discriminated response', () => {
    expect(
      v.parse(verifyOtpRequestSchema, {
        phoneNumber: '+541140392404',
        code: '123456',
      }),
    ).toEqual({ phoneNumber: '+541140392404', code: '123456' })
    expect(
      v.parse(verifyOtpResponseSchema, {
        status: 'authenticated',
        ...authSession,
      }),
    ).toEqual({ status: 'authenticated', ...authSession })
  })

  it('validates the signup-required discriminated response', () => {
    expect(
      v.parse(verifyOtpResponseSchema, {
        status: 'signup_required',
        onboardingToken: 'onboarding-token',
      }),
    ).toEqual({
      status: 'signup_required',
      onboardingToken: 'onboarding-token',
    })
  })

  it.each([
    { phoneNumber: '+541140392404', code: '12345' },
    { phoneNumber: '+541140392404', code: 'abcdef' },
  ])('rejects invalid verify request %#', (request) => {
    expect(v.safeParse(verifyOtpRequestSchema, request).success).toBe(false)
  })

  it('rejects the legacy requiresSignup shape and missing discriminator', () => {
    expect(
      v.safeParse(verifyOtpResponseSchema, {
        requiresSignup: true,
        onboardingToken: 'onboarding-token',
      }).success,
    ).toBe(false)
    expect(v.safeParse(verifyOtpResponseSchema, authSession).success).toBe(false)
  })
})

describe('POST /auth/signup/complete', () => {
  it('validates optional photo request and AuthSession success', () => {
    const request = {
      onboardingToken: 'onboarding-token',
      fullName: 'Ada Lovelace',
      cityId: 'city-1',
      profilePhotoUrl: 'https://cdn.movilis.test/ada.jpg',
    }

    expect(v.parse(completeSignupRequestSchema, request)).toEqual(request)
    expect(v.parse(authSessionSchema, authSession)).toEqual(authSession)
  })

  it.each([
    {
      onboardingToken: '',
      fullName: 'Ada Lovelace',
      cityId: 'city-1',
    },
    { onboardingToken: 'token', fullName: '', cityId: 'city-1' },
    { onboardingToken: 'token', fullName: 'Ada', cityId: '' },
    {
      onboardingToken: 'token',
      fullName: 'Ada',
      cityId: 'city-1',
      profilePhotoUrl: '/relative.jpg',
    },
  ])('rejects invalid signup request %#', (request) => {
    expect(v.safeParse(completeSignupRequestSchema, request).success).toBe(false)
  })
})

describe('refresh, logout, me, and contract wiring', () => {
  it('validates refresh and logout token requests', () => {
    expect(
      v.parse(refreshRequestSchema, { refreshToken: 'refresh-token' }),
    ).toEqual({ refreshToken: 'refresh-token' })
    expect(
      v.parse(logoutRequestSchema, { refreshToken: 'refresh-token' }),
    ).toEqual({ refreshToken: 'refresh-token' })
    expect(
      v.safeParse(refreshRequestSchema, { refreshToken: '' }).success,
    ).toBe(false)
  })

  it('defines logout success as an authoritative null response', () => {
    expect(v.parse(logoutResponseSchema, null)).toBeNull()
    expect(v.safeParse(logoutResponseSchema, undefined).success).toBe(false)
    expect(logoutContract.success).toBe(logoutResponseSchema)
  })

  it('pairs every endpoint with its exact success and canonical error', () => {
    expect(requestOtpContract.request).toBe(requestOtpRequestSchema)
    expect(requestOtpBodySchema).toBe(requestOtpRequestSchema)
    expect(requestOtpContract.success).toBe(requestOtpResponseSchema)
    expect(verifyOtpContract.request).toBe(verifyOtpRequestSchema)
    expect(verifyOtpBodySchema).toBe(verifyOtpRequestSchema)
    expect(verifyOtpContract.success).toBe(verifyOtpResponseSchema)
    expect(completeSignupContract.success).toBe(authSessionSchema)
    expect(completeSignupBodySchema).toBe(completeSignupRequestSchema)
    expect(completeSignupResponseSchema).toBe(authSessionSchema)
    expect(refreshContract.success).toBe(authSessionSchema)
    expect(refreshBodySchema).toBe(refreshRequestSchema)
    expect(refreshResponseSchema).toBe(authSessionSchema)
    expect(logoutBodySchema).toBe(logoutRequestSchema)
    expect(getMeContract.request).toBeNull()

    for (const contract of [
      requestOtpContract,
      verifyOtpContract,
      completeSignupContract,
      refreshContract,
      logoutContract,
      getMeContract,
    ]) {
      expect(contract.error).toBe(apiErrorSchema)
    }
  })
})
