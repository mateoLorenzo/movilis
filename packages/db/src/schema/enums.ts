import { pgEnum } from 'drizzle-orm/pg-core'

/** Mobile platforms supported for push notification delivery. */
export const devicePlatformEnum = pgEnum('device_platform', ['ios', 'android'])

/** User-selected cadence for locality discovery push notifications. */
export const localityDiscoveryRecurrenceEnum = pgEnum(
  'locality_discovery_recurrence',
  ['6_hours', 'daily', 'weekly', 'off'],
)

/** Direction of a post-trip review between the driver and a passenger. */
export const reviewDirectionEnum = pgEnum('review_direction', [
  'driver_to_passenger',
  'passenger_to_driver',
])

/** Lifecycle state of a published trip. Seat availability is tracked separately. */
export const tripStatusEnum = pgEnum('trip_status', [
  'scheduled',
  'ongoing',
  'cancelled',
  'completed',
])

/** Lifecycle state of a passenger seat reservation request. */
export const tripReservationStatusEnum = pgEnum('trip_reservation_status', [
  'pending',
  'confirmed',
  'cancelled',
  'rejected',
])
