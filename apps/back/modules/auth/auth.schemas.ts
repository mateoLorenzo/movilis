import { users } from '@carpooling/db'
import type { ConversionConfig } from '@valibot/to-json-schema'
import { toJsonSchema } from '@valibot/to-json-schema'
import type { Table } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-valibot'
import * as v from 'valibot'

const e164PhoneNumberSchema = v.pipe(
  v.string(),
  v.regex(/^\+[1-9]\d{7,14}$/, 'Phone number must be in E.164 format'),
)

const otpCodeSchema = v.pipe(
  v.string(),
  v.regex(/^\d{6}$/, 'OTP code must be 6 digits'),
)
const tokenSchema = v.pipe(v.string(), v.minLength(1))

const requestOtpBodySchema = v.object({
  phoneNumber: e164PhoneNumberSchema,
})

const verifyOtpBodySchema = v.object({
  phoneNumber: e164PhoneNumberSchema,
  code: otpCodeSchema,
})

const completeSignupBodySchema = v.object({
  onboardingToken: tokenSchema,
  fullName: v.pipe(v.string(), v.minLength(1)),
  cityId: v.pipe(v.string(), v.minLength(1)),
  profilePhotoUrl: v.optional(v.pipe(v.string(), v.url())),
})

const refreshBodySchema = v.object({
  refreshToken: tokenSchema,
})

const logoutBodySchema = refreshBodySchema

const userSchema = createSelectSchema(users as unknown as Table)

const jsonSchemaConfig = {
  overrideSchema: ({ valibotSchema }) => {
    if (valibotSchema.type === 'date') {
      return { type: 'string', format: 'date-time' }
    }
  },
} satisfies ConversionConfig

const tokenPairResponseSchema = {
  type: 'object',
  required: ['accessToken', 'refreshToken', 'user'],
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
    user: toJsonSchema(userSchema, jsonSchemaConfig),
  },
}

export const requestOtpSchema = {
  body: toJsonSchema(requestOtpBodySchema),
  response: {
    200: {
      type: 'object',
      required: ['expiresInSeconds'],
      properties: {
        expiresInSeconds: { type: 'number' },
        devCode: { type: 'string' },
      },
    },
  },
}

export const verifyOtpSchema = {
  body: toJsonSchema(verifyOtpBodySchema),
  response: {
    200: {
      anyOf: [
        tokenPairResponseSchema,
        {
          type: 'object',
          required: ['requiresSignup', 'onboardingToken'],
          properties: {
            requiresSignup: { type: 'boolean', const: true },
            onboardingToken: { type: 'string' },
          },
        },
      ],
    },
  },
}

export const completeSignupSchema = {
  body: toJsonSchema(completeSignupBodySchema),
  response: {
    200: tokenPairResponseSchema,
  },
}

export const refreshSchema = {
  body: toJsonSchema(refreshBodySchema),
  response: {
    200: tokenPairResponseSchema,
  },
}

export const logoutSchema = {
  body: toJsonSchema(logoutBodySchema),
  response: {
    204: { type: 'null' },
  },
}

export const meSchema = {
  response: {
    200: toJsonSchema(userSchema, jsonSchemaConfig),
  },
}
