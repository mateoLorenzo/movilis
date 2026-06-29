import { trips, type Db } from '@carpooling/db'
import { desc, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

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

export class TripsError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message)
  }
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

    if (!originCity) {
      throw new TripsError('Origin city not found')
    }

    if (!destinationCity) {
      throw new TripsError('Destination city not found')
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
