import * as v from 'valibot'

export const apiErrorCodeSchema = v.picklist([
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'INVALID_OTP',
  'INVALID_ONBOARDING_TOKEN',
  'INVALID_REFRESH_TOKEN',
  'USER_ALREADY_EXISTS',
  'CITY_NOT_FOUND',
  'USER_NOT_FOUND',
  'INVALID_DEPARTURE_TIME',
])

export type ApiErrorCode = v.InferOutput<typeof apiErrorCodeSchema>

export const validationFieldSchema = v.strictObject({
  path: v.pipe(v.string(), v.minLength(1, 'Field path must not be empty')),
  message: v.pipe(v.string(), v.minLength(1, 'Field message must not be empty')),
})

export type ValidationField = v.InferOutput<typeof validationFieldSchema>

const validationDetailsSchema = v.strictObject({
  fields: v.array(validationFieldSchema),
})

export const apiErrorSchema = v.strictObject({
  code: apiErrorCodeSchema,
  message: v.pipe(v.string(), v.minLength(1, 'Error message must not be empty')),
  requestId: v.pipe(v.string(), v.minLength(1, 'Request ID must not be empty')),
  details: v.optional(validationDetailsSchema),
})

export type ApiError = v.InferOutput<typeof apiErrorSchema>
