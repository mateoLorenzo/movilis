import { authSessions, otpChallenges, type Db } from '@movilis/db'
import { asc, inArray, lt, sql } from 'drizzle-orm'

export type CleanupAuthOptions = {
  now: Date
  batchSize: number
  otpRetentionSeconds: number
  sessionRetentionSeconds: number
}

export async function cleanupAuthData(
  db: Db,
  options: CleanupAuthOptions,
): Promise<{ challengesDeleted: number; sessionsDeleted: number }> {
  if (options.otpRetentionSeconds < 86_400) {
    throw new Error('OTP retention must be at least 86400 seconds')
  }
  if (options.sessionRetentionSeconds < 2_592_000) {
    throw new Error('Session retention must be at least 2592000 seconds')
  }
  const challengeTerminalAt = sql<Date>`coalesce(${otpChallenges.terminalAt}, ${otpChallenges.expiresAt})`
  const challengeCutoff = new Date(
    options.now.getTime() - options.otpRetentionSeconds * 1000,
  )
  const challengeIds = db
    .select({ id: otpChallenges.id })
    .from(otpChallenges)
    .where(lt(challengeTerminalAt, challengeCutoff))
    .orderBy(asc(challengeTerminalAt), asc(otpChallenges.id))
    .limit(options.batchSize)
    .for('update', { skipLocked: true })
  const deletedChallenges = await db
    .delete(otpChallenges)
    .where(inArray(otpChallenges.id, challengeIds))
    .returning({ id: otpChallenges.id })

  const sessionTerminalAt = sql<Date>`coalesce(${authSessions.revokedAt}, ${authSessions.expiresAt})`
  const sessionCutoff = new Date(
    options.now.getTime() - options.sessionRetentionSeconds * 1000,
  )
  const sessionIds = db
    .select({ id: authSessions.id })
    .from(authSessions)
    .where(lt(sessionTerminalAt, sessionCutoff))
    .orderBy(asc(sessionTerminalAt), asc(authSessions.id))
    .limit(options.batchSize)
    .for('update', { skipLocked: true })
  const deletedSessions = await db
    .delete(authSessions)
    .where(inArray(authSessions.id, sessionIds))
    .returning({ id: authSessions.id })

  return {
    challengesDeleted: deletedChallenges.length,
    sessionsDeleted: deletedSessions.length,
  }
}
