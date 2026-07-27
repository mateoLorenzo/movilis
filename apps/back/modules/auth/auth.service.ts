import { authSessions, otpChallenges, users, type Db } from '@movilis/db'
import { and, count, eq, gte, isNull } from 'drizzle-orm'
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto'

import { AppError } from '../../errors.js'

const maxOtpRequestsPerWindow = 3
const otpRequestWindowMs = 15 * 60 * 1000
const maxOtpAttempts = 3

// Transactions support DB query methods but do not expose the root pool client.
type DbClient = Omit<Db, '$client'>

type CompleteSignupInput = {
  phoneNumber: string
  fullName: string
  cityId: string
  profilePhotoUrl?: string
}

export const authService = {
  async requestOtp(db: Db, phoneNumber: string, otpTtlSeconds: number) {
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
      throw new AppError(
        'RATE_LIMITED',
        429,
        'Too many OTP requests. Try again later.',
      )
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    const expiresAt = new Date(now.getTime() + otpTtlSeconds * 1000)

    await db.insert(otpChallenges).values({
      id: randomUUID(),
      phoneNumber,
      codeHash: hashOtp(phoneNumber, code),
      expiresAt,
    })

    return { code, expiresAt }
  },

  async verifyOtp(
    db: Db,
    phoneNumber: string,
    code: string,
    refreshTokenTtlSeconds: number,
  ) {
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
      throw new AppError('INVALID_OTP', 401, 'Invalid or expired OTP code')
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

      throw new AppError('INVALID_OTP', 401, 'Invalid or expired OTP code')
    }

    await db
      .update(otpChallenges)
      .set({ consumedAt: now })
      .where(eq(otpChallenges.id, challenge.id))

    const user = await findActiveUserByPhoneNumber(db, phoneNumber)

    if (!user) {
      return { type: 'requiresSignup' as const, phoneNumber }
    }

    const refreshToken = await createRefreshSession(
      db,
      user.id,
      refreshTokenTtlSeconds,
    )
    return { type: 'authenticated' as const, user, refreshToken }
  },

  async completeSignup(
    db: Db,
    input: CompleteSignupInput,
    refreshTokenTtlSeconds: number,
  ) {
    const existingUser = await findActiveUserByPhoneNumber(
      db,
      input.phoneNumber,
    )

    if (existingUser) {
      throw new AppError('USER_ALREADY_EXISTS', 409, 'User already exists')
    }

    const city = await db.query.cities.findFirst({
      where: (cities, { eq }) => eq(cities.id, input.cityId),
    })

    if (!city) {
      throw new AppError('CITY_NOT_FOUND', 404, 'City not found')
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

    const refreshToken = await createRefreshSession(
      db,
      user.id,
      refreshTokenTtlSeconds,
    )
    return { user, refreshToken }
  },

  async refresh(
    db: Db,
    refreshToken: string,
    refreshTokenTtlSeconds: number,
  ) {
    const now = new Date()
    const tokenHash = hashToken(refreshToken)

    return db.transaction(async (tx) => {
      const session = await tx.query.authSessions.findFirst({
        where: (authSessions, { eq }) =>
          eq(authSessions.refreshTokenHash, tokenHash),
      })

      if (!session) {
        throw new AppError(
          'INVALID_REFRESH_TOKEN',
          401,
          'Invalid refresh token',
        )
      }

      if (session.revokedAt) {
        await revokeAllUserSessions(tx, session.userId)
        throw new AppError(
          'INVALID_REFRESH_TOKEN',
          401,
          'Invalid refresh token',
        )
      }

      if (session.expiresAt <= now) {
        await revokeSession(tx, session.id)
        throw new AppError(
          'INVALID_REFRESH_TOKEN',
          401,
          'Invalid refresh token',
        )
      }

      const user = await findActiveUserById(tx, session.userId)

      if (!user) {
        await revokeAllUserSessions(tx, session.userId)
        throw new AppError(
          'INVALID_REFRESH_TOKEN',
          401,
          'Invalid refresh token',
        )
      }

      const nextSession = createSessionValues(user.id, refreshTokenTtlSeconds)
      const [revokedSession] = await tx
        .update(authSessions)
        .set({ revokedAt: now, replacedBySessionId: nextSession.session.id })
        .where(
          and(eq(authSessions.id, session.id), isNull(authSessions.revokedAt)),
        )
        .returning({ id: authSessions.id })

      if (!revokedSession) {
        throw new AppError(
          'INVALID_REFRESH_TOKEN',
          401,
          'Invalid refresh token',
        )
      }

      await tx.insert(authSessions).values(nextSession.session)

      return { user, refreshToken: nextSession.refreshToken }
    })
  },

  async logout(db: DbClient, refreshToken: string) {
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

async function createRefreshSession(
  db: Db,
  userId: string,
  refreshTokenTtlSeconds: number,
) {
  const values = createSessionValues(userId, refreshTokenTtlSeconds)
  await db.insert(authSessions).values(values.session)
  return values.refreshToken
}

function createSessionValues(userId: string, refreshTokenTtlSeconds: number) {
  const refreshToken = randomBytes(32).toString('base64url')

  return {
    refreshToken,
    session: {
      id: randomUUID(),
      userId,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + refreshTokenTtlSeconds * 1000),
    },
  }
}

async function findActiveUserByPhoneNumber(db: DbClient, phoneNumber: string) {
  return db.query.users.findFirst({
    where: (users, { and, eq, isNull }) =>
      and(eq(users.phoneNumber, phoneNumber), isNull(users.deletedAt)),
  })
}

async function findActiveUserById(db: DbClient, id: string) {
  return db.query.users.findFirst({
    where: (users, { and, eq, isNull }) =>
      and(eq(users.id, id), isNull(users.deletedAt)),
  })
}

async function revokeSession(db: DbClient, sessionId: string) {
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(eq(authSessions.id, sessionId))
}

async function revokeAllUserSessions(db: DbClient, userId: string) {
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
