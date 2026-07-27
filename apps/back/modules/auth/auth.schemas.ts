import {
  authSessionSchema,
  completeSignupRequestSchema,
  logoutRequestSchema,
  logoutResponseSchema,
  privateUserSchema,
  refreshRequestSchema,
  requestOtpRequestSchema,
  requestOtpResponseSchema,
  verifyOtpRequestSchema,
  verifyOtpResponseSchema,
} from '@movilis/shared'

import { errorResponses, toFastifySchema } from '../../schemas.js'

export const requestOtpSchema = {
  body: toFastifySchema(requestOtpRequestSchema),
  response: { 200: toFastifySchema(requestOtpResponseSchema), ...errorResponses },
}

export const verifyOtpSchema = {
  body: toFastifySchema(verifyOtpRequestSchema),
  response: { 200: toFastifySchema(verifyOtpResponseSchema), ...errorResponses },
}

export const completeSignupSchema = {
  body: toFastifySchema(completeSignupRequestSchema),
  response: { 200: toFastifySchema(authSessionSchema), ...errorResponses },
}

export const refreshSchema = {
  body: toFastifySchema(refreshRequestSchema),
  response: { 200: toFastifySchema(authSessionSchema), ...errorResponses },
}

export const logoutSchema = {
  body: toFastifySchema(logoutRequestSchema),
  response: { 204: toFastifySchema(logoutResponseSchema), ...errorResponses },
}

export const meSchema = {
  response: { 200: toFastifySchema(privateUserSchema), ...errorResponses },
}
