import {
  boolean,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

import { cities } from './cities'
import { devicePlatformEnum, localityDiscoveryRecurrenceEnum } from './enums'
import { trips } from './trips'
import { users } from './users'

/** Saved trip searches used to notify users when matching trips become available. */
export const tripAlerts = pgTable('trip_alerts', {
  id: text().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  originCityId: text('origin_city_id').references(() => cities.id),
  destinationCityId: text('destination_city_id')
    .notNull()
    .references(() => cities.id),
  desiredDate: timestamp('desired_date', { withTimezone: true }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastNotifiedAt: timestamp('last_notified_at', { withTimezone: true }),
})

/** Push notification tokens registered by user devices. */
export const deviceTokens = pgTable('device_tokens', {
  id: text().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  token: text().notNull(),
  platform: devicePlatformEnum().notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
})

/** Per-user notification channel and digest preferences. */
export const notificationPreferences = pgTable('notification_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id),
  pushTransactional: boolean('push_transactional').notNull().default(true),
  pushAlerts: boolean('push_alerts').notNull().default(true),
  pushLocalityDiscoveryRecurrence: localityDiscoveryRecurrenceEnum(
    'push_locality_discovery_recurrence',
  ).notNull(),
  emailBackup: boolean('email_backup').notNull().default(false),
})

/** Notification digests sent to users with discovered nearby/locality trip options. */
export const localityDiscoveryDigests = pgTable('locality_discovery_digests', {
  id: text().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull(),
})

/** Join table listing trips included in a locality discovery digest. */
export const localityDiscoveryDigestTrips = pgTable(
  'locality_discovery_digest_trips',
  {
    digestId: text('digest_id')
      .notNull()
      .references(() => localityDiscoveryDigests.id),
    tripId: text('trip_id')
      .notNull()
      .references(() => trips.id),
  },
  (table) => [primaryKey({ columns: [table.digestId, table.tripId] })],
)
