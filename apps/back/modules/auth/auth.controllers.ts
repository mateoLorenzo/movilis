import type {
  AuthSession,
  CompleteSignupRequest,
  LogoutRequest,
  RefreshRequest,
  RequestOtpRequest,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from '@movilis/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'

import { AppError } from '../../errors.js'
import { toPrivateUser } from '../users/users.mapper.js'
import { requireAccessUserId } from './auth.require.js'
import { authService } from './auth.service.js'

export async function requestOtp(
  request: FastifyRequest<{ Body: RequestOtpRequest }>,
  reply: FastifyReply,
) {
  const otp = await authService.requestOtp(
    request.server.db,
    request.body.phoneNumber,
    request.server.authConfig.otpTtlSeconds,
  )
  return reply.send({
    expiresInSeconds: request.server.authConfig.otpTtlSeconds,
    ...(request.server.authConfig.exposeDevOtpCode ? { devCode: otp.code } : {}),
  })
}

export async function verifyOtp(
  request: FastifyRequest<{ Body: VerifyOtpRequest }>,
  reply: FastifyReply,
) {
  const result = await authService.verifyOtp(
    request.server.db,
    request.body.phoneNumber,
    request.body.code,
    request.server.authConfig.refreshTokenTtlSeconds,
  )
  if (result.type === 'requiresSignup') {
    const body: VerifyOtpResponse = {
      status: 'signup_required',
      onboardingToken: request.server.jwt.sign(
        { phoneNumber: result.phoneNumber, tokenType: 'onboarding' },
        { expiresIn: request.server.authConfig.otpTtlSeconds },
      ),
    }
    return reply.send(body)
  }
  return reply.send({
    status: 'authenticated',
    ...createAuthSession(request, result.user, result.refreshToken),
  } satisfies VerifyOtpResponse)
}

export async function completeSignup(
  request: FastifyRequest<{ Body: CompleteSignupRequest }>,
  reply: FastifyReply,
) {
  let payload: { phoneNumber?: string; tokenType?: string }
  try {
    payload = request.server.jwt.verify(request.body.onboardingToken)
  } catch {
    throw new AppError(
      'INVALID_ONBOARDING_TOKEN',
      'Invalid onboarding token',
    )
  }
  if (payload.tokenType !== 'onboarding' || !payload.phoneNumber) {
    throw new AppError(
      'INVALID_ONBOARDING_TOKEN',
      'Invalid onboarding token',
    )
  }
  const result = await authService.completeSignup(
    request.server.db,
    {
      phoneNumber: payload.phoneNumber,
      fullName: request.body.fullName,
      cityId: request.body.cityId,
      profilePhotoUrl: request.body.profilePhotoUrl,
    },
    request.server.authConfig.refreshTokenTtlSeconds,
  )
  return reply.send(createAuthSession(request, result.user, result.refreshToken))
}

export async function refresh(
  request: FastifyRequest<{ Body: RefreshRequest }>,
  reply: FastifyReply,
) {
  const result = await authService.refresh(
    request.server.db,
    request.body.refreshToken,
    request.server.authConfig.refreshTokenTtlSeconds,
  )
  return reply.send(createAuthSession(request, result.user, result.refreshToken))
}

export async function logout(
  request: FastifyRequest<{ Body: LogoutRequest }>,
  reply: FastifyReply,
) {
  await authService.logout(request.server.db, request.body.refreshToken)
  return reply.code(204).send()
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  const userId = await requireAccessUserId(request)
  const user = await authService.getActiveUserById(request.server.db, userId)
  if (!user) {
    throw new AppError('UNAUTHENTICATED', 'Authentication required')
  }
  return reply.send(toPrivateUser(user))
}

function createAuthSession(
  request: FastifyRequest,
  user: Parameters<typeof toPrivateUser>[0],
  refreshToken: string,
): AuthSession {
  return {
    accessToken: request.server.jwt.sign(
      { sub: user.id, tokenType: 'access' },
      { expiresIn: request.server.authConfig.accessTokenTtlSeconds },
    ),
    refreshToken,
    user: toPrivateUser(user),
  }
}
