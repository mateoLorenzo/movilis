import type { FastifyReply, FastifyRequest } from 'fastify'

import { requireAccessUserId } from '../auth/auth.require.js'
import { TripsError, tripsService } from './trips.service.js'

type CreateTripBody = {
  originCityId: string
  destinationCityId: string
  departureAt: string
  totalSeats: number
  pricePerSeat: number
  contactPhoneNumber: string
  notes?: string
}

export async function createTrip(
  request: FastifyRequest<{ Body: CreateTripBody }>,
  reply: FastifyReply,
) {
  const driverId = await requireAccessUserId(request, reply)

  if (!driverId) {
    return
  }

  const departureAt = new Date(request.body.departureAt)

  if (Number.isNaN(departureAt.getTime()) || departureAt <= new Date()) {
    return reply
      .code(400)
      .send({ message: 'Departure date must be in the future' })
  }

  try {
    const trip = await tripsService.create(request.server.db, {
      driverId,
      originCityId: request.body.originCityId,
      destinationCityId: request.body.destinationCityId,
      departureAt,
      totalSeats: request.body.totalSeats,
      pricePerSeat: request.body.pricePerSeat,
      contactPhoneNumber: request.body.contactPhoneNumber,
      notes: request.body.notes,
    })

    return reply.code(201).send(trip)
  } catch (error) {
    return sendTripsError(reply, error)
  }
}

export async function listMyTrips(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const driverId = await requireAccessUserId(request, reply)

  if (!driverId) {
    return
  }

  const trips = await tripsService.listMine(request.server.db, driverId)

  return reply.send(trips)
}

function sendTripsError(reply: FastifyReply, error: unknown) {
  if (error instanceof TripsError) {
    return reply.code(error.statusCode).send({ message: error.message })
  }

  throw error
}
