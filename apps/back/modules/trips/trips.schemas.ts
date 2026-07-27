import {
  createTripRequestSchema,
  listMyTripsResponseSchema,
  ownedTripSchema,
} from '@movilis/shared'

import { errorResponses, toFastifySchema } from '../../schemas.js'

export const createTripSchema = {
  body: toFastifySchema(createTripRequestSchema),
  response: { 201: toFastifySchema(ownedTripSchema), ...errorResponses },
}

export const listMyTripsSchema = {
  response: { 200: toFastifySchema(listMyTripsResponseSchema), ...errorResponses },
}
