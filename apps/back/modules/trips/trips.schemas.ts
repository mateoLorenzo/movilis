import { trips } from '@carpooling/db'
import type { ConversionConfig } from '@valibot/to-json-schema'
import { toJsonSchema } from '@valibot/to-json-schema'
import type { Table } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-valibot'
import * as v from 'valibot'

const e164PhoneNumberSchema = v.pipe(
  v.string(),
  v.regex(/^\+[1-9]\d{7,14}$/, 'Phone number must be in E.164 format'),
)

const createTripBodySchema = v.object({
  originCityId: v.pipe(v.string(), v.minLength(1)),
  destinationCityId: v.pipe(v.string(), v.minLength(1)),
  departureAt: v.pipe(v.string(), v.isoTimestamp()),
  totalSeats: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(8)),
  pricePerSeat: v.pipe(v.number(), v.minValue(0)),
  contactPhoneNumber: e164PhoneNumberSchema,
  notes: v.optional(v.string()),
})

const tripSchema = createSelectSchema(trips as unknown as Table)

const jsonSchemaConfig = {
  overrideSchema: ({ valibotSchema }) => {
    if (valibotSchema.type === 'date') {
      return { type: 'string', format: 'date-time' }
    }
  },
} satisfies ConversionConfig

export const createTripSchema = {
  body: toJsonSchema(createTripBodySchema),
  response: {
    201: toJsonSchema(tripSchema, jsonSchemaConfig),
  },
}

export const listMyTripsSchema = {
  response: {
    200: {
      type: 'array',
      items: toJsonSchema(tripSchema, jsonSchemaConfig),
    },
  },
}
