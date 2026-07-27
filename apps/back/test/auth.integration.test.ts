import { authSessions, otpChallenges, users } from '@movilis/db'
import {
  apiErrorSchema,
  authSessionSchema,
  privateUserSchema,
  requestOtpResponseSchema,
  verifyOtpResponseSchema,
} from '@movilis/shared'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { safeParse } from 'valibot'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  completeSignup,
  createIntegrationApp,
  requestOtp,
  seedCity,
  seedUser,
} from './fixtures.js'
import { testDb, testPool } from './database.js'

describe.sequential('authentication endpoint contracts', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await createIntegrationApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it('POST /auth/otp/request returns its shared success contract', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/otp/request',
      payload: { phoneNumber: '+541140392404' },
    })
    expect(response.statusCode).toBe(200)
    expect(safeParse(requestOtpResponseSchema, response.json()).success).toBe(true)
    expect(response.json()).toMatchObject({ expiresInSeconds: 600 })
  })

  it('returns a field path for an invalid OTP request', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/otp/request',
      payload: { phoneNumber: '1140392404' },
    })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: { fields: [{ path: 'body.phoneNumber' }] },
    })
    expect(safeParse(apiErrorSchema, response.json()).success).toBe(true)
  })

  it('rate limits the fourth OTP request', async () => {
    for (let request = 0; request < 3; request += 1) {
      expect((await app.inject({ method: 'POST', url: '/auth/otp/request', payload: { phoneNumber: '+541140392404' } })).statusCode).toBe(200)
    }
    const response = await app.inject({ method: 'POST', url: '/auth/otp/request', payload: { phoneNumber: '+541140392404' } })
    expect(response.statusCode).toBe(429)
    expect(response.json()).toMatchObject({ code: 'RATE_LIMITED' })
  })

  it('serializes concurrent OTP requests at the per-phone cap', async () => {
    const responses = await Promise.all(
      Array.from({ length: 8 }, () =>
        app.inject({
          method: 'POST',
          url: '/auth/otp/request',
          payload: { phoneNumber: '+541140392404' },
        }),
      ),
    )

    expect(responses.filter(({ statusCode }) => statusCode === 200)).toHaveLength(3)
    expect(responses.filter(({ statusCode }) => statusCode === 429)).toHaveLength(5)
  })

  it('POST /auth/otp/verify returns signup_required', async () => {
    const { devCode } = await requestOtp(app)
    const response = await app.inject({ method: 'POST', url: '/auth/otp/verify', payload: { phoneNumber: '+541140392404', code: devCode } })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ status: 'signup_required' })
    expect(safeParse(verifyOtpResponseSchema, response.json()).success).toBe(true)
  })

  it('POST /auth/otp/verify returns authenticated with a private user', async () => {
    await seedCity()
    await seedUser('city-1')
    const { devCode } = await requestOtp(app)
    const response = await app.inject({ method: 'POST', url: '/auth/otp/verify', payload: { phoneNumber: '+541140392404', code: devCode } })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ status: 'authenticated', user: { id: 'user-1', phoneNumber: '+541140392404' } })
    expect(safeParse(verifyOtpResponseSchema, response.json()).success).toBe(true)
    expect(response.body).not.toContain('createdAt')
    expect(response.body).not.toContain('deletedAt')
  })

  it('maps an invalid OTP to INVALID_OTP', async () => {
    await requestOtp(app)
    const response = await app.inject({ method: 'POST', url: '/auth/otp/verify', payload: { phoneNumber: '+541140392404', code: '000000' } })
    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({ code: 'INVALID_OTP' })
  })

  it('does not lose concurrent wrong-attempt increments', async () => {
    const { devCode } = await requestOtp(app)
    const wrongCode = devCode === '000000' ? '111111' : '000000'

    const responses = await Promise.all(
      Array.from({ length: 3 }, () =>
        app.inject({
          method: 'POST',
          url: '/auth/otp/verify',
          payload: { phoneNumber: '+541140392404', code: wrongCode },
        }),
      ),
    )
    expect(responses.every(({ statusCode }) => statusCode === 401)).toBe(true)

    const valid = await app.inject({
      method: 'POST',
      url: '/auth/otp/verify',
      payload: { phoneNumber: '+541140392404', code: devCode },
    })
    expect(valid.statusCode).toBe(401)
    const [challenge] = await testDb
      .select()
      .from(otpChallenges)
      .where(eq(otpChallenges.phoneNumber, '+541140392404'))
    expect(challenge.attempts).toBe(3)
    expect(challenge.consumedAt).not.toBeNull()
  })

  it('claims a valid OTP once when issuing an onboarding token', async () => {
    const { devCode } = await requestOtp(app)
    const responses = await Promise.all(
      Array.from({ length: 2 }, () =>
        app.inject({
          method: 'POST',
          url: '/auth/otp/verify',
          payload: { phoneNumber: '+541140392404', code: devCode },
        }),
      ),
    )
    expect(responses.map(({ statusCode }) => statusCode).sort()).toEqual([200, 401])
  })

  it('claims a valid OTP once when issuing an authenticated session', async () => {
    await seedCity()
    await seedUser('city-1')
    const { devCode } = await requestOtp(app)
    const responses = await Promise.all(
      Array.from({ length: 2 }, () =>
        app.inject({
          method: 'POST',
          url: '/auth/otp/verify',
          payload: { phoneNumber: '+541140392404', code: devCode },
        }),
      ),
    )
    expect(responses.map(({ statusCode }) => statusCode).sort()).toEqual([200, 401])
    const sessions = await testDb.select().from(authSessions)
    expect(sessions).toHaveLength(1)
  })

  it('POST /auth/signup/complete returns AuthSession', async () => {
    await seedCity()
    const response = await completeSignup(app, 'city-1')
    expect(response.statusCode).toBe(200)
    expect(safeParse(authSessionSchema, response.json()).success).toBe(true)
  })

  it.each([
    ['invalid token', { onboardingToken: 'invalid', fullName: 'Ada', cityId: 'city-1' }, 401, 'INVALID_ONBOARDING_TOKEN'],
    ['missing city', { onboardingToken: '', fullName: 'Ada', cityId: 'absent' }, 404, 'CITY_NOT_FOUND'],
  ] as const)('maps signup domain failure: %s', async (_name, payload, status, code) => {
    await seedCity()
    const onboardingToken = payload.onboardingToken || app.jwt.sign({ phoneNumber: '+541140392404', tokenType: 'onboarding' })
    const response = await app.inject({ method: 'POST', url: '/auth/signup/complete', payload: { ...payload, onboardingToken } })
    expect(response.statusCode).toBe(status)
    expect(response.json()).toMatchObject({ code })
  })

  it('maps duplicate signup to USER_ALREADY_EXISTS', async () => {
    await seedCity()
    await seedUser('city-1')
    const onboardingToken = app.jwt.sign({ phoneNumber: '+541140392404', tokenType: 'onboarding' })
    const response = await app.inject({ method: 'POST', url: '/auth/signup/complete', payload: { onboardingToken, fullName: 'Ada', cityId: 'city-1' } })
    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({ code: 'USER_ALREADY_EXISTS' })
  })

  it('maps a concurrent signup unique violation to USER_ALREADY_EXISTS', async () => {
    await seedCity()
    const onboardingToken = app.jwt.sign({
      phoneNumber: '+541140392404',
      tokenType: 'onboarding',
    })
    const responses = await Promise.all(
      Array.from({ length: 2 }, () =>
        app.inject({
          method: 'POST',
          url: '/auth/signup/complete',
          payload: { onboardingToken, fullName: 'Ada', cityId: 'city-1' },
        }),
      ),
    )

    expect(responses.map(({ statusCode }) => statusCode).sort()).toEqual([200, 409])
    expect(responses.find(({ statusCode }) => statusCode === 409)?.json()).toMatchObject({
      code: 'USER_ALREADY_EXISTS',
      message: 'User already exists',
    })
  })

  it('rolls back the user when initial refresh-session creation fails', async () => {
    await seedCity()
    await testPool.query(`
      CREATE FUNCTION test_fail_auth_session_insert() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'forced auth session insert failure';
      END;
      $$;
      CREATE TRIGGER test_fail_auth_session_insert
      BEFORE INSERT ON auth_sessions
      FOR EACH ROW EXECUTE FUNCTION test_fail_auth_session_insert();
    `)

    try {
      const onboardingToken = app.jwt.sign({
        phoneNumber: '+541140392404',
        tokenType: 'onboarding',
      })
      const response = await app.inject({
        method: 'POST',
        url: '/auth/signup/complete',
        payload: { onboardingToken, fullName: 'Ada', cityId: 'city-1' },
      })

      expect(response.statusCode).toBe(500)
      const createdUsers = await testDb
        .select()
        .from(users)
        .where(eq(users.phoneNumber, '+541140392404'))
      expect(createdUsers).toHaveLength(0)
    } finally {
      await testPool.query(`
        DROP TRIGGER test_fail_auth_session_insert ON auth_sessions;
        DROP FUNCTION test_fail_auth_session_insert();
      `)
    }
  })

  it('POST /auth/refresh rotates a session and rejects reuse', async () => {
    await seedCity()
    const signup = await completeSignup(app, 'city-1')
    const original = signup.json<{ refreshToken: string }>().refreshToken
    const refreshed = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken: original } })
    expect(refreshed.statusCode).toBe(200)
    expect(safeParse(authSessionSchema, refreshed.json()).success).toBe(true)
    const replacement = refreshed.json<{ refreshToken: string }>().refreshToken
    expect(replacement).not.toBe(original)
    const reused = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken: original } })
    expect(reused.statusCode).toBe(401)
    const error = reused.json()
    expect(error).toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
      requestId: expect.any(String),
    })
    expect(safeParse(apiErrorSchema, error).success).toBe(true)
    expect(reused.headers['x-request-id']).toBe(error.requestId)

    const revokedReplacement = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: replacement },
    })
    expect(revokedReplacement.statusCode).toBe(401)
    expect(revokedReplacement.json()).toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
    })
  })

  it('POST /auth/logout returns 204 and revokes the refresh token', async () => {
    await seedCity()
    const signup = await completeSignup(app, 'city-1')
    const refreshToken = signup.json<{ refreshToken: string }>().refreshToken
    const logout = await app.inject({ method: 'POST', url: '/auth/logout', payload: { refreshToken } })
    expect(logout.statusCode).toBe(204)
    expect(logout.body).toBe('')
    const refresh = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken } })
    expect(refresh.statusCode).toBe(401)
  })

  it('GET /auth/me returns only PrivateUser fields', async () => {
    await seedCity()
    const signup = await completeSignup(app, 'city-1')
    const accessToken = signup.json<{ accessToken: string }>().accessToken
    const response = await app.inject({ method: 'GET', url: '/auth/me', headers: { authorization: `Bearer ${accessToken}` } })
    expect(response.statusCode).toBe(200)
    expect(safeParse(privateUserSchema, response.json()).success).toBe(true)
    expect(response.body).not.toContain('createdAt')
    expect(response.body).not.toContain('updatedAt')
    expect(response.body).not.toContain('deletedAt')
  })

  it('GET /auth/me maps absent credentials to UNAUTHENTICATED', async () => {
    const response = await app.inject({ method: 'GET', url: '/auth/me' })
    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({ code: 'UNAUTHENTICATED' })
  })
})
