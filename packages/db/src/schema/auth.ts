import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'

import { otpChallengePurpose, otpChallengeStatus } from './enums.js'
import { users } from './users.js'

/** Short-lived phone verification challenges used by passwordless auth. */
export const otpChallenges = pgTable(
  'otp_challenges',
  {
    id: text().primaryKey(),
    phoneNumber: text('phone_number').notNull(),
    codeHash: text('code_hash').notNull(),
    purpose: otpChallengePurpose().notNull(),
    status: otpChallengeStatus().notNull(),
    subjectUserId: text('subject_user_id').references(() => users.id),
    identifierHash: text('identifier_hash').notNull(),
    ipHash: text('ip_hash'),
    deviceHash: text('device_hash'),
    providerMessageId: text('provider_message_id'),
    attempts: integer().notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    terminalAt: timestamp('terminal_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('otp_challenges_phone_purpose_status_created_at_idx').on(
      table.phoneNumber,
      table.purpose,
      table.status,
      table.createdAt,
    ),
    index('otp_challenges_identifier_hash_created_at_idx').on(
      table.identifierHash,
      table.createdAt,
    ),
    index('otp_challenges_ip_hash_created_at_idx').on(
      table.ipHash,
      table.createdAt,
    ),
    index('otp_challenges_device_hash_created_at_idx').on(
      table.deviceHash,
      table.createdAt,
    ),
    index('otp_challenges_cleanup_idx').on(
      sql`coalesce(${table.terminalAt}, ${table.expiresAt})`,
      table.id,
    ),
  ],
)

/** Refresh-token sessions for mobile clients. Tokens are stored hashed for revocation. */
export const authSessions = pgTable(
  'auth_sessions',
  {
    id: text().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedBySessionId: text('replaced_by_session_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('auth_sessions_user_id_idx').on(table.userId),
    index('auth_sessions_cleanup_idx').on(
      sql`coalesce(${table.revokedAt}, ${table.expiresAt})`,
      table.id,
    ),
    unique('auth_sessions_refresh_token_hash_unique').on(table.refreshTokenHash),
  ],
)
