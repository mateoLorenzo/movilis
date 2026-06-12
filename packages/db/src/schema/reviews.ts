import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { reviewDirectionEnum } from './enums'
import { trips } from './trips'
import { users } from './users'

/** Ratings and comments users leave for each other after a trip. */
export const reviews = pgTable('reviews', {
  id: text().primaryKey(),
  tripId: text('trip_id')
    .notNull()
    .references(() => trips.id),
  reviewerId: text('reviewer_id')
    .notNull()
    .references(() => users.id),
  revieweeId: text('reviewee_id')
    .notNull()
    .references(() => users.id),
  rating: integer().notNull(), // from 1 to 5
  comment: text(),
  direction: reviewDirectionEnum().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
