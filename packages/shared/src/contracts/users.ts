import * as v from 'valibot'

import { apiErrorSchema } from '../primitives/error.js'
import { idSchema } from '../primitives/id.js'

export const phoneNumberSchema = v.pipe(
  v.string(),
  v.regex(/^\+[1-9]\d{7,14}$/, 'Phone number must be in E.164 format'),
)

export type PhoneNumber = v.InferOutput<typeof phoneNumberSchema>

const publicUserEntries = {
  id: idSchema,
  fullName: v.pipe(v.string(), v.minLength(1, 'Full name must not be empty')),
  profilePhotoUrl: v.nullable(v.pipe(v.string(), v.url('Invalid profile URL'))),
  ratingAverage: v.pipe(
    v.number(),
    v.finite('Rating average must be finite'),
    v.minValue(0),
    v.maxValue(5),
  ),
  ratingCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
} as const

export const publicUserSchema = v.strictObject(publicUserEntries)

export type PublicUser = v.InferOutput<typeof publicUserSchema>

export const privateUserSchema = v.strictObject({
  ...publicUserEntries,
  phoneNumber: phoneNumberSchema,
  cityId: idSchema,
})

export type PrivateUser = v.InferOutput<typeof privateUserSchema>

export const getUserByIdResponseSchema = publicUserSchema
export type GetUserByIdResponse = v.InferOutput<
  typeof getUserByIdResponseSchema
>

export const getMeResponseSchema = privateUserSchema
export type GetMeResponse = v.InferOutput<typeof getMeResponseSchema>

export const getUserByIdParamsSchema = v.strictObject({
  id: idSchema,
})

export type GetUserByIdParams = v.InferOutput<typeof getUserByIdParamsSchema>

export const userIdParamsSchema = getUserByIdParamsSchema
export type UserIdParams = v.InferOutput<typeof userIdParamsSchema>

export const getUserByIdContract = {
  request: getUserByIdParamsSchema,
  success: getUserByIdResponseSchema,
  error: apiErrorSchema,
} as const

export const getMeContract = {
  request: null,
  success: getMeResponseSchema,
  error: apiErrorSchema,
} as const
