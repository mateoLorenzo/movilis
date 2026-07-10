import { integer, pgTable, real, text, timestamp } from 'drizzle-orm/pg-core'

import { cities } from './cities'
import { tripReservationStatusEnum, tripStatusEnum } from './enums'
import { users } from './users'

/** Trips published by drivers between two cities with seat and pricing information. */
export const trips = pgTable('trips', {
  id: text().primaryKey(),
  driverId: text('driver_id')
    .notNull()
    .references(() => users.id),
  originCityId: text('origin_city_id')
    .notNull()
    .references(() => cities.id),
  destinationCityId: text('destination_city_id')
    .notNull()
    .references(() => cities.id),
  departureAt: timestamp('departure_at', { withTimezone: true }).notNull(),
  totalSeats: integer('total_seats').notNull(),
  availableSeats: integer('available_seats').notNull(),
  pricePerSeat: real('price_per_seat').notNull(),
  contactPhoneNumber: text('contact_phone_number').notNull(),
  notes: text(),
  status: tripStatusEnum().notNull(),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** Seat reservations created by passengers for published trips. */
export const tripReservations = pgTable('trip_reservations', {
  id: text().primaryKey(),
  tripId: text('trip_id')
    .notNull()
    .references(() => trips.id),
  passengerId: text('passenger_id')
    .notNull()
    .references(() => users.id),
  status: tripReservationStatusEnum().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelledBy: text('cancelled_by'),
})
