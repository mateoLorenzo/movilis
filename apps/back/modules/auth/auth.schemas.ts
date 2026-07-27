import {
  completeSignupRequestSchema,
  completeSignupResponseSchema,
  getMeResponseSchema,
  logoutRequestSchema,
  refreshRequestSchema,
  refreshResponseSchema,
  requestOtpRequestSchema,
  requestOtpResponseSchema,
  verifyOtpRequestSchema,
  verifyOtpResponseSchema,
} from '@movilis/shared'

import { toFastifySchema } from '../../schemas.js'

export const requestOtpSchema = {
  body: toFastifySchema(requestOtpRequestSchema),
  response: {
    200: toFastifySchema(requestOtpResponseSchema),
  },
}

export const verifyOtpSchema = {
  body: toFastifySchema(verifyOtpRequestSchema),
  response: {
    200: toFastifySchema(verifyOtpResponseSchema),
  },
}

export const completeSignupSchema = {
  body: toFastifySchema(completeSignupRequestSchema),
  response: {
    200: toFastifySchema(completeSignupResponseSchema),
  },
}

export const refreshSchema = {
  body: toFastifySchema(refreshRequestSchema),
  response: {
    200: toFastifySchema(refreshResponseSchema),
  },
}

export const logoutSchema = {
  body: toFastifySchema(logoutRequestSchema),
  response: {
    204: { type: 'null' },
  },
}

export const meSchema = {
  response: {
    200: toFastifySchema(getMeResponseSchema),
  },
}
