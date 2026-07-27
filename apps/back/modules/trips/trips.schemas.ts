import {
  createTripRequestSchema,
  createTripResponseSchema,
  listMyTripsResponseSchema,
} from '@movilis/shared'

import { toFastifySchema } from '../../schemas.js'

export const createTripSchema = {
  body: toFastifySchema(createTripRequestSchema),
  response: {
    201: toFastifySchema(createTripResponseSchema),
  },
}

export const listMyTripsSchema = {
  response: {
    200: toFastifySchema(listMyTripsResponseSchema),
  },
}
