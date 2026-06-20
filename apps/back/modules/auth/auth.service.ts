import { authSessions, otpChallenges, users, type Db } from '@carpooling/db'
import { and, count, eq, gte, isNull } from 'drizzle-orm'
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto'

import { authConfig } from '../../auth.js'

const maxOtpRequestsPerWindow = 3
const otpRequestWindowMs = 15 * 60 * 1000
const maxOtpAttempts = 3

export class AuthError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message)
  }
}

export const authService = {
  async requestOtp(db: Db, phoneNumber: string) {
    const now = new Date()
    const requestWindowStart = new Date(now.getTime() - otpRequestWindowMs)
    const [{ requestCount }] = await db
      .select({ requestCount: count() })
      .from(otpChallenges)
      .where(
        and(
          eq(otpChallenges.phoneNumber, phoneNumber),
          gte(otpChallenges.createdAt, requestWindowStart),
        ),
      )

    if (requestCount >= maxOtpRequestsPerWindow) {
      throw new AuthError('Too many OTP requests. Try again later.', 429)
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    const expiresAt = new Date(now.getTime() + authConfig.otpTtlSeconds * 1000)

    await db.insert(otpChallenges).values({
      id: randomUUID(),
      phoneNumber,
      codeHash: hashOtp(phoneNumber, code),
      expiresAt,
    })

    return { code, expiresAt }
  },

  async verifyOtp(db: Db, phoneNumber: string, code: string) {
    const now = new Date()
    const challenge = await db.query.otpChallenges.findFirst({
      where: (otpChallenges, { and, eq, gt, isNull }) =>
        and(
          eq(otpChallenges.phoneNumber, phoneNumber),
          isNull(otpChallenges.consumedAt),
          gt(otpChallenges.expiresAt, now),
        ),
      orderBy: (otpChallenges, { desc }) => [desc(otpChallenges.createdAt)],
    })

    if (!challenge) {
      throw new AuthError('Invalid or expired OTP code', 401)
    }

    if (challenge.codeHash !== hashOtp(phoneNumber, code)) {
      const attempts = challenge.attempts + 1
      await db
        .update(otpChallenges)
        .set({
          attempts,
          consumedAt: attempts >= maxOtpAttempts ? now : null,
        })
        .where(eq(otpChallenges.id, challenge.id))

      throw new AuthError('Invalid or expired OTP code', 401)
    }

    await db
      .update(otpChallenges)
      .set({ consumedAt: now })
      .where(eq(otpChallenges.id, challenge.id))

    const user = await findActiveUserByPhoneNumber(db, phoneNumber)

    if (!user) {
      return { type: 'requiresSignup' as const, phoneNumber }
    }

    const refreshToken = await createRefreshSession(db, user.id)
    return { type: 'authenticated' as const, user, refreshToken }
  },

  async completeSignup(
    db: Db,
    input: {
      phoneNumber: string
      fullName: string
      cityId: string
      profilePhotoUrl?: string
    },
  ) {
    const existingUser = await findActiveUserByPhoneNumber(
      db,
      input.phoneNumber,
    )

    if (existingUser) {
      throw new AuthError('User already exists', 409)
    }

    const city = await db.query.cities.findFirst({
      where: (cities, { eq }) => eq(cities.id, input.cityId),
    })

    if (!city) {
      throw new AuthError('City not found', 400)
    }

    const [user] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        phoneNumber: input.phoneNumber,
        fullName: input.fullName,
        cityId: input.cityId,
        profilePhotoUrl: input.profilePhotoUrl,
      })
      .returning()

    const refreshToken = await createRefreshSession(db, user.id)
    return { user, refreshToken }
  },

  async refresh(db: Db, refreshToken: string) {
    const now = new Date()
    const tokenHash = hashToken(refreshToken)
    const session = await db.query.authSessions.findFirst({
      where: (authSessions, { eq }) =>
        eq(authSessions.refreshTokenHash, tokenHash),
    })

    if (!session) {
      throw new AuthError('Invalid refresh token', 401)
    }

    if (session.revokedAt) {
      await revokeAllUserSessions(db, session.userId)
      throw new AuthError('Invalid refresh token', 401)
    }

    if (session.expiresAt <= now) {
      await revokeSession(db, session.id)
      throw new AuthError('Invalid refresh token', 401)
    }

    const user = await findActiveUserById(db, session.userId)

    if (!user) {
      await revokeAllUserSessions(db, session.userId)
      throw new AuthError('Invalid refresh token', 401)
    }

    const nextSession = createSessionValues(user.id)
    await db.insert(authSessions).values(nextSession.session)
    await db
      .update(authSessions)
      .set({ revokedAt: now, replacedBySessionId: nextSession.session.id })
      .where(eq(authSessions.id, session.id))

    return { user, refreshToken: nextSession.refreshToken }
  },

  async logout(db: Db, refreshToken: string) {
    const session = await db.query.authSessions.findFirst({
      where: (authSessions, { eq }) =>
        eq(authSessions.refreshTokenHash, hashToken(refreshToken)),
    })

    if (session && !session.revokedAt) {
      await revokeSession(db, session.id)
    }
  },

  async getActiveUserById(db: Db, userId: string) {
    return findActiveUserById(db, userId)
  },
}

async function createRefreshSession(db: Db, userId: string) {
  const values = createSessionValues(userId)
  await db.insert(authSessions).values(values.session)
  return values.refreshToken
}

function createSessionValues(userId: string) {
  const refreshToken = randomBytes(32).toString('base64url')

  return {
    refreshToken,
    session: {
      id: randomUUID(),
      userId,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: new Date(
        Date.now() + authConfig.refreshTokenTtlSeconds * 1000,
      ),
    },
  }
}

async function findActiveUserByPhoneNumber(db: Db, phoneNumber: string) {
  return db.query.users.findFirst({
    where: (users, { and, eq, isNull }) =>
      and(eq(users.phoneNumber, phoneNumber), isNull(users.deletedAt)),
  })
}

async function findActiveUserById(db: Db, id: string) {
  return db.query.users.findFirst({
    where: (users, { and, eq, isNull }) =>
      and(eq(users.id, id), isNull(users.deletedAt)),
  })
}

async function revokeSession(db: Db, sessionId: string) {
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(eq(authSessions.id, sessionId))
}

async function revokeAllUserSessions(db: Db, userId: string) {
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)))
}

function hashOtp(phoneNumber: string, code: string) {
  return createHash('sha256').update(`${phoneNumber}:${code}`).digest('hex')
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
