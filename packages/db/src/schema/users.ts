import { integer, pgTable, real, text, timestamp } from 'drizzle-orm/pg-core'

import { cities } from './cities'

/** App users who can drive trips, reserve seats, receive alerts, and write reviews. */
export const users = pgTable('users', {
  id: text().primaryKey(),
  phoneNumber: text('phone_number').notNull().unique(),
  fullName: text('full_name').notNull(),
  profilePhotoUrl: text('profile_photo_url'),
  cityId: text('city_id')
    .notNull()
    .references(() => cities.id),
  ratingAverage: real('rating_average').notNull().default(0),
  ratingCount: integer('rating_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})
