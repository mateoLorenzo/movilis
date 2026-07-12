import type { FastifyReply, FastifyRequest } from 'fastify'

import { authConfig } from '../../auth.js'
import { requireAccessUserId } from './auth.require.js'
import { AuthError, authService } from './auth.service.js'

type RequestOtpBody = { phoneNumber: string }
type VerifyOtpBody = { phoneNumber: string; code: string }
type CompleteSignupBody = {
  onboardingToken: string
  fullName: string
  cityId: string
  profilePhotoUrl?: string
}
type RefreshBody = { refreshToken: string }

export async function requestOtp(
  request: FastifyRequest<{ Body: RequestOtpBody }>,
  reply: FastifyReply,
) {
  try {
    const otp = await authService.requestOtp(
      request.server.db,
      request.body.phoneNumber,
    )

    return reply.send({
      expiresInSeconds: authConfig.otpTtlSeconds,
      ...(authConfig.exposeDevOtpCode ? { devCode: otp.code } : {}),
    })
  } catch (error) {
    return sendAuthError(reply, error)
  }
}

export async function verifyOtp(
  request: FastifyRequest<{ Body: VerifyOtpBody }>,
  reply: FastifyReply,
) {
  try {
    const result = await authService.verifyOtp(
      request.server.db,
      request.body.phoneNumber,
      request.body.code,
    )

    if (result.type === 'requiresSignup') {
      return reply.send({
        requiresSignup: true,
        onboardingToken: request.server.jwt.sign(
          { phoneNumber: result.phoneNumber, tokenType: 'onboarding' },
          { expiresIn: authConfig.otpTtlSeconds },
        ),
      })
    }

    return reply.send(
      createTokenResponse(request, result.user, result.refreshToken),
    )
  } catch (error) {
    return sendAuthError(reply, error)
  }
}

export async function completeSignup(
  request: FastifyRequest<{ Body: CompleteSignupBody }>,
  reply: FastifyReply,
) {
  let payload: { phoneNumber?: string; tokenType?: string }

  try {
    payload = request.server.jwt.verify(request.body.onboardingToken) as {
      phoneNumber?: string
      tokenType?: string
    }
  } catch {
    return reply.code(401).send({ message: 'Invalid onboarding token' })
  }

  if (payload.tokenType !== 'onboarding' || !payload.phoneNumber) {
    return reply.code(401).send({ message: 'Invalid onboarding token' })
  }

  try {
    const result = await authService.completeSignup(request.server.db, {
      phoneNumber: payload.phoneNumber,
      fullName: request.body.fullName,
      cityId: request.body.cityId,
      profilePhotoUrl: request.body.profilePhotoUrl,
    })

    return reply.send(
      createTokenResponse(request, result.user, result.refreshToken),
    )
  } catch (error) {
    return sendAuthError(reply, error)
  }
}

export async function refresh(
  request: FastifyRequest<{ Body: RefreshBody }>,
  reply: FastifyReply,
) {
  try {
    const result = await authService.refresh(
      request.server.db,
      request.body.refreshToken,
    )

    return reply.send(
      createTokenResponse(request, result.user, result.refreshToken),
    )
  } catch (error) {
    return sendAuthError(reply, error)
  }
}

export async function logout(
  request: FastifyRequest<{ Body: RefreshBody }>,
  reply: FastifyReply,
) {
  await authService.logout(request.server.db, request.body.refreshToken)
  return reply.code(204).send()
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  const userId = await requireAccessUserId(request, reply)

  if (!userId) {
    return
  }

  const user = await authService.getActiveUserById(request.server.db, userId)

  if (!user) {
    return reply.code(401).send({ message: 'Invalid access token' })
  }

  return reply.send(user)
}

function createTokenResponse(
  request: FastifyRequest,
  user: { id: string },
  refreshToken: string,
) {
  return {
    accessToken: request.server.jwt.sign(
      { sub: user.id, tokenType: 'access' },
      { expiresIn: authConfig.accessTokenTtlSeconds },
    ),
    refreshToken,
    user,
  }
}

function sendAuthError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ message: error.message })
  }

  throw error
}
