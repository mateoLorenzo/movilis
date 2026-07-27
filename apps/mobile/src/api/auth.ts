import {
  completeSignupResponseSchema,
  privateUserSchema,
  refreshResponseSchema,
  requestOtpResponseSchema,
  verifyOtpResponseSchema,
} from '@movilis/shared'
import type {
  CompleteSignupRequest,
  PrivateUser,
  RequestOtpRequest,
  RequestOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from '@movilis/shared'

import type { HttpTransport } from './client'
import type { SessionCoordinator } from './session'

export interface AuthApi {
  requestOtp(body: RequestOtpRequest): Promise<RequestOtpResponse>
  verifyOtp(body: VerifyOtpRequest): Promise<VerifyOtpResponse>
  completeSignup(body: CompleteSignupRequest): Promise<PrivateUser>
  me(): Promise<PrivateUser>
  restore(): Promise<PrivateUser | null>
  logout(): Promise<void>
}

export function createAuthApi({
  transport,
  session,
}: {
  transport: HttpTransport
  session: SessionCoordinator
}): AuthApi {
  return {
    requestOtp: (body) =>
      transport.request({
        method: 'POST',
        path: '/auth/otp/request',
        body,
        auth: false,
        responseSchema: requestOtpResponseSchema,
      }),
    async verifyOtp(body) {
      const result = await transport.request({
        method: 'POST',
        path: '/auth/otp/verify',
        body,
        auth: false,
        responseSchema: verifyOtpResponseSchema,
      })
      if (result.status === 'authenticated') {
        await session.accept({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
        })
      }
      return result
    },
    async completeSignup(body) {
      const result = await transport.request({
        method: 'POST',
        path: '/auth/signup/complete',
        body,
        auth: false,
        responseSchema: completeSignupResponseSchema,
      })
      return session.accept(result)
    },
    me: () =>
      session.request({
        method: 'GET',
        path: '/auth/me',
        responseSchema: privateUserSchema,
      }),
    restore: () => session.restore(),
    logout: () => session.logout(),
  }
}

export function createRefreshRequest(transport: HttpTransport) {
  return (refreshToken: string) =>
    transport.request({
      method: 'POST',
      path: '/auth/refresh',
      body: { refreshToken },
      auth: false,
      responseSchema: refreshResponseSchema,
    })
}

export function createLogoutRequest(transport: HttpTransport) {
  return (refreshToken: string) =>
    transport.request({
      method: 'POST',
      path: '/auth/logout',
      body: { refreshToken },
      auth: false,
    })
}
