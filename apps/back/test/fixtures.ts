import { cities, users } from '@movilis/db'
import type { FastifyInstance } from 'fastify'

import { buildApp } from '../app.js'
import type { AuthSecurityConfig } from '../config.js'
import { developmentSmsSender } from '../modules/auth/development.sms-sender.js'
import type { SmsSender } from '../modules/auth/sms.sender.js'
import { testDb } from './database.js'

type IntegrationAppOptions = {
  authConfig?: Partial<AuthSecurityConfig>
  smsSender?: SmsSender
  trustedProxies?: string[]
}

export async function createIntegrationApp(
  options: IntegrationAppOptions = {},
): Promise<FastifyInstance> {
  return buildApp({
    db: testDb,
    jwtSecret: 'integration-test-secret',
    authConfig: {
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 2_592_000,
      otpTtlSeconds: 600,
      exposeDevOtpCode: true,
      otpCodeHmacSecret: 'integration-otp-secret',
      rateLimitHmacSecret: 'integration-rate-limit-secret',
      resendCooldownSeconds: 60,
      phoneWindowSeconds: 900,
      phoneWindowMaxRequests: 3,
      ipWindowSeconds: 900,
      ipWindowMaxRequests: 10,
      deviceWindowSeconds: 900,
      deviceWindowMaxRequests: 5,
      maxOtpAttempts: 3,
      otpRetentionSeconds: 86_400,
      sessionRetentionSeconds: 2_592_000,
      cleanupBatchSize: 500,
      ...options.authConfig,
    },
    smsSender: options.smsSender ?? developmentSmsSender,
    trustedProxies: options.trustedProxies ?? [],
    logger: false,
  })
}

export async function seedCity(id = 'city-1') {
  const [city] = await testDb
    .insert(cities)
    .values({
      id,
      name: id === 'city-1' ? 'Buenos Aires' : 'La Plata',
      province: 'Buenos Aires',
      latitude: -34.6037,
      longitude: -58.3816,
      isPopular: true,
    })
    .returning()
  return city
}

export async function seedUser(
  cityId: string,
  id = 'user-1',
  phoneNumber = '+541140392404',
) {
  const [user] = await testDb
    .insert(users)
    .values({
      id,
      phoneNumber,
      fullName: 'Ada Lovelace',
      profilePhotoUrl: null,
      cityId,
      ratingAverage: 4.5,
      ratingCount: 8,
    })
    .returning()
  return user
}

export function accessToken(app: FastifyInstance, userId: string) {
  return app.jwt.sign({ sub: userId, tokenType: 'access' })
}

export async function requestOtp(
  app: FastifyInstance,
  phoneNumber = '+541140392404',
  deviceId?: string,
) {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/otp/request',
    headers: deviceId ? { 'x-device-id': deviceId } : undefined,
    payload: { phoneNumber },
  })
  if (response.statusCode !== 200) {
    throw new Error(`OTP request failed: ${response.statusCode} ${response.body}`)
  }
  return response.json<{
    expiresInSeconds: number
    resendAfterSeconds: number
    devCode: string
  }>()
}

export async function completeSignup(
  app: FastifyInstance,
  cityId: string,
  phoneNumber = '+541140392404',
) {
  const { devCode } = await requestOtp(app, phoneNumber)
  const verification = await app.inject({
    method: 'POST',
    url: '/auth/otp/verify',
    payload: { phoneNumber, code: devCode },
  })
  const { onboardingToken } = verification.json<{ onboardingToken: string }>()
  return app.inject({
    method: 'POST',
    url: '/auth/signup/complete',
    payload: {
      onboardingToken,
      fullName: 'Ada Lovelace',
      cityId,
      profilePhotoUrl: 'https://example.com/ada.jpg',
    },
  })
}
