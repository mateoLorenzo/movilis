import {
  createTripRequestSchema,
  createTripResponseSchema,
  listMyTripsResponseSchema,
} from '@movilis/shared'

import { errorResponses, toFastifySchema } from '../../schemas.js'

export const createTripSchema = {
  body: toFastifySchema(createTripRequestSchema),
  response: {
    ...errorResponses,
    201: toFastifySchema(createTripResponseSchema),
  },
}

export const listMyTripsSchema = {
  response: {
    ...errorResponses,
    200: toFastifySchema(listMyTripsResponseSchema),
  },
}
