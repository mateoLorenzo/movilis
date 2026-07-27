import {
  completeSignupResponseSchema,
  createTripResponseSchema,
  listMyTripsResponseSchema,
  privateUserSchema,
  publicUserSchema,
  refreshResponseSchema,
  requestOtpResponseSchema,
  verifyOtpResponseSchema,
} from '@movilis/shared'
import type { AuthSession, PrivateUser } from '@movilis/shared'
import { describe, expect, it, vi } from 'vitest'

import { createAuthApi, createLogoutRequest, createRefreshRequest } from './auth'
import type { HttpTransport } from './client'
import type { SessionCoordinator } from './session'
import { createTripsApi } from './trips'
import { createUsersApi } from './users'

const user = { id: 'user-1' } as PrivateUser
const authSession = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  user,
} as AuthSession

function setup() {
  const transportRequest = vi.fn<(options: any) => Promise<any>>()
  const sessionRequest = vi.fn<(options: any) => Promise<any>>()
  const transport = { request: transportRequest } as HttpTransport
  const session = {
    accept: vi.fn(async () => user),
    restore: vi.fn(),
    request: sessionRequest,
    logout: vi.fn(),
    getAccessToken: vi.fn(),
  } as SessionCoordinator
  return { transport, transportRequest, session, sessionRequest }
}

describe('auth API', () => {
  it('keeps OTP requests public and adopts authenticated OTP results', async () => {
    const { transport, transportRequest, session } = setup()
    transportRequest
      .mockResolvedValueOnce({ expiresInSeconds: 600 })
      .mockResolvedValueOnce({ status: 'authenticated', ...authSession })
    const auth = createAuthApi({ transport, session })
    const requestBody = { phoneNumber: '+541140392404' }
    const verifyBody = { ...requestBody, code: '123456' }

    await auth.requestOtp(requestBody)
    const result = await auth.verifyOtp(verifyBody)

    expect(transportRequest).toHaveBeenNthCalledWith(1, {
      method: 'POST',
      path: '/auth/otp/request',
      body: requestBody,
      auth: false,
      responseSchema: requestOtpResponseSchema,
    })
    expect(transportRequest).toHaveBeenNthCalledWith(2, {
      method: 'POST',
      path: '/auth/otp/verify',
      body: verifyBody,
      auth: false,
      responseSchema: verifyOtpResponseSchema,
    })
    expect(session.accept).toHaveBeenCalledWith(authSession)
    expect(result).toEqual({ status: 'authenticated', ...authSession })
  })

  it('leaves signup-required OTP results anonymous', async () => {
    const { transport, transportRequest, session } = setup()
    const signupRequired = {
      status: 'signup_required' as const,
      onboardingToken: 'onboarding-1',
    }
    transportRequest.mockResolvedValue(signupRequired)
    const auth = createAuthApi({ transport, session })

    await expect(
      auth.verifyOtp({ phoneNumber: '+541140392404', code: '123456' }),
    ).resolves.toEqual(signupRequired)
    expect(session.accept).not.toHaveBeenCalled()
  })

  it('adopts signup credentials and delegates me, restore, and logout', async () => {
    const { transport, transportRequest, session, sessionRequest } = setup()
    transportRequest.mockResolvedValue(authSession)
    sessionRequest.mockResolvedValue(user)
    vi.mocked(session.restore).mockResolvedValue(user)
    const auth = createAuthApi({ transport, session })
    const signupBody = {
      onboardingToken: 'onboarding-1',
      fullName: 'Ada Driver',
      cityId: 'city-1',
    }

    await expect(auth.completeSignup(signupBody)).resolves.toBe(user)
    await expect(auth.me()).resolves.toBe(user)
    await expect(auth.restore()).resolves.toBe(user)
    await auth.logout()

    expect(transportRequest).toHaveBeenCalledWith({
      method: 'POST',
      path: '/auth/signup/complete',
      body: signupBody,
      auth: false,
      responseSchema: completeSignupResponseSchema,
    })
    expect(session.accept).toHaveBeenCalledWith(authSession)
    expect(sessionRequest).toHaveBeenCalledWith({
      method: 'GET',
      path: '/auth/me',
      responseSchema: privateUserSchema,
    })
    expect(session.restore).toHaveBeenCalledOnce()
    expect(session.logout).toHaveBeenCalledOnce()
  })

  it('creates public refresh and logout requests for session coordination', async () => {
    const { transport, transportRequest } = setup()
    transportRequest
      .mockResolvedValueOnce(authSession)
      .mockResolvedValueOnce(undefined)

    await createRefreshRequest(transport)('refresh-1')
    await createLogoutRequest(transport)('refresh-1')

    expect(transportRequest).toHaveBeenNthCalledWith(1, {
      method: 'POST',
      path: '/auth/refresh',
      body: { refreshToken: 'refresh-1' },
      auth: false,
      responseSchema: refreshResponseSchema,
    })
    expect(transportRequest).toHaveBeenNthCalledWith(2, {
      method: 'POST',
      path: '/auth/logout',
      body: { refreshToken: 'refresh-1' },
      auth: false,
    })
  })
})

describe('trips and users APIs', () => {
  it('binds authenticated trip calls to their shared contracts', async () => {
    const { session, sessionRequest } = setup()
    const trips = createTripsApi(session)
    const createBody = {
      originCityId: 'city-1',
      destinationCityId: 'city-2',
      departureAt: '2026-08-01T12:00:00Z',
      totalSeats: 3,
      pricePerSeat: { amount: '8500.00', currency: 'ARS' as const },
      contactPhoneNumber: '+541140392404',
    }

    await trips.listMine()
    await trips.create(createBody)

    expect(sessionRequest).toHaveBeenNthCalledWith(1, {
      method: 'GET',
      path: '/trips/mine',
      responseSchema: listMyTripsResponseSchema,
    })
    expect(sessionRequest).toHaveBeenNthCalledWith(2, {
      method: 'POST',
      path: '/trips',
      body: createBody,
      responseSchema: createTripResponseSchema,
    })
  })

  it('binds public user lookup and safely encodes the ID path segment', async () => {
    const { transport, transportRequest } = setup()
    const users = createUsersApi(transport)

    await users.getById('user/with space')

    expect(transportRequest).toHaveBeenCalledWith({
      method: 'GET',
      path: '/users/user%2Fwith%20space',
      auth: false,
      responseSchema: publicUserSchema,
    })
  })
})
