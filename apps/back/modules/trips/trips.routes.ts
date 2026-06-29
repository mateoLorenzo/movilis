import type { FastifyPluginAsync } from 'fastify'

import { createTrip, listMyTrips } from './trips.controllers.js'
import { createTripSchema, listMyTripsSchema } from './trips.schemas.js'

const tripsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', { schema: createTripSchema }, createTrip)
  app.get('/mine', { schema: listMyTripsSchema }, listMyTrips)
}

export default tripsRoutes
