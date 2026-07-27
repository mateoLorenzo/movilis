import * as v from 'valibot'

import { phoneNumberSchema } from './users.js'
import { apiErrorSchema } from '../primitives/error.js'
import { idSchema } from '../primitives/id.js'
import { moneySchema } from '../primitives/money.js'
import { cursorPageSchema } from '../primitives/pagination.js'
import { timestampSchema } from '../primitives/timestamp.js'

export const tripStatusSchema = v.picklist([
  'scheduled',
  'ongoing',
  'cancelled',
  'completed',
])
export type TripStatus = v.InferOutput<typeof tripStatusSchema>

export const createTripRequestSchema = v.strictObject({
  originCityId: idSchema,
  destinationCityId: idSchema,
  departureAt: timestampSchema,
  totalSeats: v.pipe(
    v.number(),
    v.integer(),
    v.minValue(1),
    v.maxValue(8),
  ),
  pricePerSeat: moneySchema,
  contactPhoneNumber: phoneNumberSchema,
  notes: v.optional(v.string()),
})
export type CreateTripRequest = v.InferOutput<typeof createTripRequestSchema>
export const createTripBodySchema = createTripRequestSchema
export type CreateTripBody = v.InferOutput<typeof createTripBodySchema>

export const ownedTripSchema = v.pipe(
  v.strictObject({
    id: idSchema,
    driverId: idSchema,
    originCityId: idSchema,
    destinationCityId: idSchema,
    departureAt: timestampSchema,
    totalSeats: v.pipe(v.number(), v.integer(), v.minValue(0)),
    availableSeats: v.pipe(v.number(), v.integer(), v.minValue(0)),
    pricePerSeat: moneySchema,
    contactPhoneNumber: phoneNumberSchema,
    notes: v.nullable(v.string()),
    status: tripStatusSchema,
    cancelledAt: v.nullable(timestampSchema),
    completedAt: v.nullable(timestampSchema),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  }),
  v.forward(
    v.check(
      (trip) => trip.availableSeats <= trip.totalSeats,
      'Available seats must not exceed total seats',
    ),
    ['availableSeats'],
  ),
)
export type OwnedTrip = v.InferOutput<typeof ownedTripSchema>

export const createTripResponseSchema = ownedTripSchema
export type CreateTripResponse = v.InferOutput<typeof createTripResponseSchema>

export const listMyTripsResponseSchema = cursorPageSchema(ownedTripSchema)
export type ListMyTripsResponse = v.InferOutput<
  typeof listMyTripsResponseSchema
>
export const ownedTripPageSchema = listMyTripsResponseSchema

export const createTripContract = {
  request: createTripRequestSchema,
  success: createTripResponseSchema,
  error: apiErrorSchema,
} as const

export const listMyTripsContract = {
  request: null,
  success: listMyTripsResponseSchema,
  error: apiErrorSchema,
} as const
