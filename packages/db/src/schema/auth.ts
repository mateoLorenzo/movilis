import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { users } from './users.js'

/** Short-lived phone verification challenges used by passwordless auth. */
export const otpChallenges = pgTable(
  'otp_challenges',
  {
    id: text().primaryKey(),
    phoneNumber: text('phone_number').notNull(),
    codeHash: text('code_hash').notNull(),
    attempts: integer().notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('otp_challenges_phone_number_idx').on(table.phoneNumber),
    index('otp_challenges_created_at_idx').on(table.createdAt),
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
    index('auth_sessions_refresh_token_hash_idx').on(table.refreshTokenHash),
  ],
)
