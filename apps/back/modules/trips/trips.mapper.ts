import { trips } from '@movilis/db'
import type { OwnedTrip } from '@movilis/shared'

import { moneyFromDatabase } from '../../money.js'

type TripRow = typeof trips.$inferSelect

export function toOwnedTrip(trip: TripRow): OwnedTrip {
  return {
    id: trip.id,
    driverId: trip.driverId,
    originCityId: trip.originCityId,
    destinationCityId: trip.destinationCityId,
    departureAt: trip.departureAt.toISOString(),
    totalSeats: trip.totalSeats,
    availableSeats: trip.availableSeats,
    pricePerSeat: moneyFromDatabase(trip.pricePerSeat),
    contactPhoneNumber: trip.contactPhoneNumber,
    notes: trip.notes,
    status: trip.status,
    cancelledAt: trip.cancelledAt?.toISOString() ?? null,
    completedAt: trip.completedAt?.toISOString() ?? null,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
  }
}
