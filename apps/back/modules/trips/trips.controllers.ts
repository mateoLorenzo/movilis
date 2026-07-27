import type { CreateTripRequest } from '@movilis/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'

import { AppError } from '../../errors.js'
import { moneyToDatabase } from '../../money.js'
import { requireAccessUserId } from '../auth/auth.require.js'
import { toOwnedTrip } from './trips.mapper.js'
import { tripsService } from './trips.service.js'

export async function createTrip(
  request: FastifyRequest<{ Body: CreateTripRequest }>,
  reply: FastifyReply,
) {
  const driverId = await requireAccessUserId(request)
  const departureAt = new Date(request.body.departureAt)
  if (Number.isNaN(departureAt.getTime()) || departureAt <= new Date()) {
    throw new AppError(
      'INVALID_DEPARTURE_TIME',
      'Departure date must be in the future',
    )
  }
  const trip = await tripsService.create(request.server.db, {
    driverId,
    originCityId: request.body.originCityId,
    destinationCityId: request.body.destinationCityId,
    departureAt,
    totalSeats: request.body.totalSeats,
    pricePerSeat: moneyToDatabase(request.body.pricePerSeat),
    contactPhoneNumber: request.body.contactPhoneNumber,
    notes: request.body.notes,
  })
  return reply.code(201).send(toOwnedTrip(trip))
}

export async function listMyTrips(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const driverId = await requireAccessUserId(request)
  const trips = await tripsService.listMine(request.server.db, driverId)
  return reply.send({ items: trips.map(toOwnedTrip), nextCursor: null })
}
