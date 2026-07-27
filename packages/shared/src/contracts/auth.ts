import * as v from 'valibot'

import { apiErrorSchema } from '../primitives/error.js'
import { idSchema } from '../primitives/id.js'
import { phoneNumberSchema, privateUserSchema } from './users.js'

const tokenSchema = v.pipe(v.string(), v.minLength(1, 'Token must not be empty'))
const otpCodeSchema = v.pipe(
  v.string(),
  v.regex(/^\d{6}$/, 'OTP code must be 6 digits'),
)

export const requestOtpRequestSchema = v.strictObject({
  phoneNumber: phoneNumberSchema,
})
export type RequestOtpRequest = v.InferOutput<typeof requestOtpRequestSchema>
export const requestOtpBodySchema = requestOtpRequestSchema
export type RequestOtpBody = v.InferOutput<typeof requestOtpBodySchema>

export const requestOtpResponseSchema = v.strictObject({
  expiresInSeconds: v.pipe(v.number(), v.integer(), v.minValue(1)),
  devCode: v.optional(otpCodeSchema),
})
export type RequestOtpResponse = v.InferOutput<typeof requestOtpResponseSchema>

export const verifyOtpRequestSchema = v.strictObject({
  phoneNumber: phoneNumberSchema,
  code: otpCodeSchema,
})
export type VerifyOtpRequest = v.InferOutput<typeof verifyOtpRequestSchema>
export const verifyOtpBodySchema = verifyOtpRequestSchema
export type VerifyOtpBody = v.InferOutput<typeof verifyOtpBodySchema>

const authSessionEntries = {
  accessToken: tokenSchema,
  refreshToken: tokenSchema,
  user: privateUserSchema,
} as const

export const authSessionSchema = v.strictObject(authSessionEntries)
export type AuthSession = v.InferOutput<typeof authSessionSchema>

export const completeSignupResponseSchema = authSessionSchema
export type CompleteSignupResponse = v.InferOutput<
  typeof completeSignupResponseSchema
>

export const refreshResponseSchema = authSessionSchema
export type RefreshResponse = v.InferOutput<typeof refreshResponseSchema>

const authenticatedOtpResponseSchema = v.strictObject({
  status: v.literal('authenticated'),
  ...authSessionEntries,
})

const signupRequiredOtpResponseSchema = v.strictObject({
  status: v.literal('signup_required'),
  onboardingToken: tokenSchema,
})

export const verifyOtpResponseSchema = v.variant('status', [
  authenticatedOtpResponseSchema,
  signupRequiredOtpResponseSchema,
])
export type VerifyOtpResponse = v.InferOutput<typeof verifyOtpResponseSchema>

export const completeSignupRequestSchema = v.strictObject({
  onboardingToken: tokenSchema,
  fullName: v.pipe(v.string(), v.minLength(1, 'Full name must not be empty')),
  cityId: idSchema,
  profilePhotoUrl: v.optional(v.pipe(v.string(), v.url('Invalid profile URL'))),
})
export type CompleteSignupRequest = v.InferOutput<
  typeof completeSignupRequestSchema
>
export const completeSignupBodySchema = completeSignupRequestSchema
export type CompleteSignupBody = v.InferOutput<typeof completeSignupBodySchema>

export const refreshRequestSchema = v.strictObject({
  refreshToken: tokenSchema,
})
export type RefreshRequest = v.InferOutput<typeof refreshRequestSchema>
export const refreshBodySchema = refreshRequestSchema
export type RefreshBody = v.InferOutput<typeof refreshBodySchema>

export const logoutRequestSchema = refreshRequestSchema
export type LogoutRequest = v.InferOutput<typeof logoutRequestSchema>
export const logoutBodySchema = logoutRequestSchema
export type LogoutBody = v.InferOutput<typeof logoutBodySchema>

export const logoutResponseSchema = v.null()
export type LogoutResponse = v.InferOutput<typeof logoutResponseSchema>

export const requestOtpContract = {
  request: requestOtpRequestSchema,
  success: requestOtpResponseSchema,
  error: apiErrorSchema,
} as const

export const verifyOtpContract = {
  request: verifyOtpRequestSchema,
  success: verifyOtpResponseSchema,
  error: apiErrorSchema,
} as const

export const completeSignupContract = {
  request: completeSignupRequestSchema,
  success: completeSignupResponseSchema,
  error: apiErrorSchema,
} as const

export const refreshContract = {
  request: refreshRequestSchema,
  success: refreshResponseSchema,
  error: apiErrorSchema,
} as const

export const logoutContract = {
  request: logoutRequestSchema,
  success: logoutResponseSchema,
  error: apiErrorSchema,
} as const
