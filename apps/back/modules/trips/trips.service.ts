import { trips, type Db } from '@movilis/db'
import { desc, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

import { AppError } from '../../errors.js'

type CreateTripInput = {
  driverId: string
  originCityId: string
  destinationCityId: string
  departureAt: Date
  totalSeats: number
  pricePerSeat: number
  contactPhoneNumber: string
  notes?: string
}

export const tripsService = {
  async create(db: Db, input: CreateTripInput) {
    const [originCity, destinationCity] = await Promise.all([
      db.query.cities.findFirst({
        where: (cities, { eq }) => eq(cities.id, input.originCityId),
      }),
      db.query.cities.findFirst({
        where: (cities, { eq }) => eq(cities.id, input.destinationCityId),
      }),
    ])

    if (!originCity || !destinationCity) {
      throw new AppError('CITY_NOT_FOUND', 404, 'City not found')
    }

    const [trip] = await db
      .insert(trips)
      .values({
        id: randomUUID(),
        driverId: input.driverId,
        originCityId: input.originCityId,
        destinationCityId: input.destinationCityId,
        departureAt: input.departureAt,
        totalSeats: input.totalSeats,
        availableSeats: input.totalSeats,
        pricePerSeat: input.pricePerSeat,
        contactPhoneNumber: input.contactPhoneNumber,
        notes: input.notes,
        status: 'scheduled',
      })
      .returning()

    return trip
  },

  async listMine(db: Db, driverId: string) {
    return db
      .select()
      .from(trips)
      .where(eq(trips.driverId, driverId))
      .orderBy(desc(trips.departureAt))
  },
}
