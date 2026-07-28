import { authSessions, otpChallenges, users, type Db } from '@movilis/db'
import {
  and,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  sql,
} from 'drizzle-orm'
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
} from 'node:crypto'

import type { AuthSecurityConfig } from '../../config.js'
import { AppError } from '../../errors.js'
import type { SmsSender } from './sms.sender.js'

// Transactions support DB query methods but do not expose the root pool client.
type DbClient = Omit<Db, '$client'>

type RequestOtpContext = {
  phoneNumber: string
  ipAddress: string
  deviceId?: string
}

type CompleteSignupInput = {
  phoneNumber: string
  fullName: string
  cityId: string
  profilePhotoUrl?: string
}

export const authService = {
  async requestOtp(
    db: Db,
    sender: SmsSender,
    context: RequestOtpContext,
    config: AuthSecurityConfig,
  ) {
    const challengeId = randomUUID()
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    const otpSecret = requiredSecret(
      config.otpCodeHmacSecret,
      'OTP_CODE_HMAC_SECRET',
    )
    const identifierSecret = requiredSecret(
      config.rateLimitHmacSecret,
      'AUTH_RATE_LIMIT_HMAC_SECRET',
    )
    const identifierHash = hashIdentifier(
      identifierSecret,
      'phone',
      context.phoneNumber,
    )
    const ipHash = hashIdentifier(identifierSecret, 'ip', context.ipAddress)
    const deviceHash = context.deviceId
      ? hashIdentifier(identifierSecret, 'device', context.deviceId)
      : null

    const expiresAt = await db.transaction(async (tx) => {
      const lockKeys = [identifierHash, ipHash, deviceHash]
        .filter((hash): hash is string => hash !== null)
        .map(advisoryLockKey)
        .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
      for (const lockKey of new Set(lockKeys)) {
        await tx.execute(sql`select pg_advisory_xact_lock(${lockKey})`)
      }

      const now = new Date()
      const challengeExpiresAt = new Date(
        now.getTime() + config.otpTtlSeconds * 1000,
      )

      await enforceRequestLimit(
        tx,
        eq(otpChallenges.identifierHash, identifierHash),
        new Date(now.getTime() - config.resendCooldownSeconds * 1000),
        1,
      )
      await enforceRequestLimit(
        tx,
        eq(otpChallenges.identifierHash, identifierHash),
        new Date(now.getTime() - config.phoneWindowSeconds * 1000),
        config.phoneWindowMaxRequests,
      )
      await enforceRequestLimit(
        tx,
        eq(otpChallenges.ipHash, ipHash),
        new Date(now.getTime() - config.ipWindowSeconds * 1000),
        config.ipWindowMaxRequests,
      )
      if (deviceHash) {
        await enforceRequestLimit(
          tx,
          eq(otpChallenges.deviceHash, deviceHash),
          new Date(now.getTime() - config.deviceWindowSeconds * 1000),
          config.deviceWindowMaxRequests,
        )
      }

      await tx
        .update(otpChallenges)
        .set({ status: 'superseded', terminalAt: now })
        .where(
          and(
            eq(otpChallenges.phoneNumber, context.phoneNumber),
            eq(otpChallenges.purpose, 'login'),
            inArray(otpChallenges.status, ['pending', 'deliverable']),
            isNull(otpChallenges.consumedAt),
            gt(otpChallenges.expiresAt, now),
          ),
        )

      await tx.insert(otpChallenges).values({
        id: challengeId,
        phoneNumber: context.phoneNumber,
        codeHash: hashOtp(
          otpSecret,
          challengeId,
          'login',
          context.phoneNumber,
          code,
        ),
        purpose: 'login',
        status: 'pending',
        identifierHash,
        ipHash,
        deviceHash,
        expiresAt: challengeExpiresAt,
      })
      return challengeExpiresAt
    })

    let delivery: { providerMessageId: string }
    try {
      const deliveryLifetime = remainingOtpLifetime(expiresAt)
      if (deliveryLifetime <= 0) {
        await markPendingDeliveryFailed(db, challengeId)
        throw new AppError('SMS_DELIVERY_FAILED', 'SMS delivery failed')
      }
      delivery = await sender.sendOtp({
        phoneNumber: context.phoneNumber,
        code,
        expiresInSeconds: deliveryLifetime,
      })
    } catch (error) {
      await markPendingDeliveryFailed(db, challengeId)
      if (error instanceof AppError) throw error
      throw new AppError('SMS_DELIVERY_FAILED', 'SMS delivery failed')
    }

    const acceptance = await db.transaction(async (tx) => {
      const [challenge] = await tx
        .select({
          status: otpChallenges.status,
          expiresAt: otpChallenges.expiresAt,
        })
        .from(otpChallenges)
        .where(eq(otpChallenges.id, challengeId))
        .for('update')
      if (!challenge || challenge.status !== 'pending') return 'superseded' as const

      const acceptedAt = new Date()
      const remainingSeconds = remainingOtpLifetime(
        challenge.expiresAt,
        acceptedAt,
      )
      if (remainingSeconds <= 0) {
        await tx
          .update(otpChallenges)
          .set({ status: 'delivery_failed', terminalAt: acceptedAt })
          .where(
            and(
              eq(otpChallenges.id, challengeId),
              eq(otpChallenges.status, 'pending'),
            ),
          )
        return 'expired' as const
      }
      await tx
        .update(otpChallenges)
        .set({
          status: 'deliverable',
          providerMessageId: delivery.providerMessageId,
        })
        .where(eq(otpChallenges.id, challengeId))
      return { remainingSeconds }
    })
    if (acceptance === 'superseded') {
      throw new AppError('OTP_SUPERSEDED', 'OTP request was superseded')
    }
    if (acceptance === 'expired') {
      throw new AppError('SMS_DELIVERY_FAILED', 'SMS delivery failed')
    }

    return {
      code,
      expiresAt,
      expiresInSeconds: acceptance.remainingSeconds,
      resendAfterSeconds: config.resendCooldownSeconds,
    }
  },

  async verifyOtp(
    db: Db,
    phoneNumber: string,
    code: string,
    config: AuthSecurityConfig,
  ) {
    const now = new Date()
    const otpSecret = requiredSecret(
      config.otpCodeHmacSecret,
      'OTP_CODE_HMAC_SECRET',
    )
    const result = await db.transaction(async (tx) => {
      const [challenge] = await tx
        .select()
        .from(otpChallenges)
        .where(
          and(
            eq(otpChallenges.phoneNumber, phoneNumber),
            eq(otpChallenges.purpose, 'login'),
            eq(otpChallenges.status, 'deliverable'),
            isNull(otpChallenges.consumedAt),
            gt(otpChallenges.expiresAt, now),
          ),
        )
        .orderBy(desc(otpChallenges.createdAt))
        .limit(1)
        .for('update')

      if (!challenge) return { type: 'invalid' as const }

      if (
        challenge.codeHash !==
        hashOtp(
          otpSecret,
          challenge.id,
          challenge.purpose,
          phoneNumber,
          code,
        )
      ) {
        const attempts = challenge.attempts + 1
        await tx
          .update(otpChallenges)
          .set({
            attempts,
            consumedAt: attempts >= config.maxOtpAttempts ? now : null,
            terminalAt: attempts >= config.maxOtpAttempts ? now : null,
            status:
              attempts >= config.maxOtpAttempts ? 'consumed' : challenge.status,
          })
          .where(eq(otpChallenges.id, challenge.id))
        return { type: 'invalid' as const }
      }

      await tx
        .update(otpChallenges)
        .set({ consumedAt: now, terminalAt: now, status: 'consumed' })
        .where(eq(otpChallenges.id, challenge.id))

      const user = await findActiveUserByPhoneNumber(tx, phoneNumber)
      if (!user) return { type: 'requiresSignup' as const, phoneNumber }

      const refreshToken = await createRefreshSession(
        tx,
        user.id,
        config.refreshTokenTtlSeconds,
      )
      return { type: 'authenticated' as const, user, refreshToken }
    })

    if (result.type === 'invalid') {
      throw new AppError('INVALID_OTP', 'Invalid or expired OTP code')
    }
    return result
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
      throw new AppError('USER_ALREADY_EXISTS', 'User already exists')
    }

    const city = await db.query.cities.findFirst({
      where: (cities, { eq }) => eq(cities.id, input.cityId),
    })

    if (!city) {
      throw new AppError('CITY_NOT_FOUND', 'City not found')
    }

    let result: {
      user: typeof users.$inferSelect
      refreshToken: string
    }
    try {
      result = await db.transaction(async (tx) => {
        const [user] = await tx
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
          tx,
          user.id,
          refreshTokenTtlSeconds,
        )
        return { user, refreshToken }
      })
    } catch (error) {
      if (isUserPhoneUniqueViolation(error)) {
        throw new AppError('USER_ALREADY_EXISTS', 'User already exists')
      }
      throw error
    }

    return result
  },

  async refresh(
    db: Db,
    refreshToken: string,
    refreshTokenTtlSeconds: number,
  ) {
    const now = new Date()
    const tokenHash = hashToken(refreshToken)

    const result = await db.transaction(async (tx) => {
      const session = await tx.query.authSessions.findFirst({
        where: (authSessions, { eq }) =>
          eq(authSessions.refreshTokenHash, tokenHash),
      })

      if (!session) {
        return null
      }

      if (session.revokedAt) {
        await revokeAllUserSessions(tx, session.userId)
        return null
      }

      if (session.expiresAt <= now) {
        await revokeSession(tx, session.id)
        return null
      }

      const user = await findActiveUserById(tx, session.userId)

      if (!user) {
        await revokeAllUserSessions(tx, session.userId)
        return null
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
        await revokeAllUserSessions(tx, session.userId)
        return null
      }

      await tx.insert(authSessions).values(nextSession.session)

      return { user, refreshToken: nextSession.refreshToken }
    })

    if (!result) {
      throw new AppError(
        'INVALID_REFRESH_TOKEN',
        'Invalid refresh token',
      )
    }

    return result
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

  async logoutAll(db: DbClient, userId: string) {
    await revokeAllUserSessions(db, userId)
  },

  async getActiveUserById(db: Db, userId: string) {
    return findActiveUserById(db, userId)
  },
}

async function markPendingDeliveryFailed(db: DbClient, challengeId: string) {
  await db
    .update(otpChallenges)
    .set({ status: 'delivery_failed', terminalAt: new Date() })
    .where(
      and(
        eq(otpChallenges.id, challengeId),
        eq(otpChallenges.status, 'pending'),
      ),
    )
}

function remainingOtpLifetime(expiresAt: Date, now = new Date()): number {
  return Math.ceil((expiresAt.getTime() - now.getTime()) / 1000)
}

async function createRefreshSession(
  db: DbClient,
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

async function enforceRequestLimit(
  db: DbClient,
  identifierCondition: ReturnType<typeof eq>,
  windowStart: Date,
  maxRequests: number,
) {
  const [{ requestCount }] = await db
    .select({ requestCount: count() })
    .from(otpChallenges)
    .where(
      and(
        identifierCondition,
        gt(otpChallenges.createdAt, windowStart),
      ),
    )
  if (requestCount >= maxRequests) {
    throw new AppError(
      'RATE_LIMITED',
      'Too many OTP requests. Try again later.',
    )
  }
}

function hashOtp(
  secret: string,
  challengeId: string,
  purpose: string,
  phone: string,
  code: string,
): string {
  return createHmac('sha256', secret)
    .update(`${challengeId}:${purpose}:${phone}:${code}`)
    .digest('hex')
}

function hashIdentifier(
  secret: string,
  dimension: 'phone' | 'ip' | 'device',
  value: string,
): string {
  return createHmac('sha256', secret)
    .update(`${dimension}:${value}`)
    .digest('hex')
}

function advisoryLockKey(hash: string): bigint {
  return BigInt.asIntN(64, BigInt(`0x${hash.slice(0, 16)}`))
}

function requiredSecret(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required for OTP operations`)
  return value
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function isUserPhoneUniqueViolation(error: unknown): boolean {
  let current = error
  const seen = new Set<unknown>()
  while (typeof current === 'object' && current !== null && !seen.has(current)) {
    seen.add(current)
    if (
      'code' in current &&
      current.code === '23505' &&
      'constraint' in current &&
      current.constraint === 'users_phone_number_unique'
    ) {
      return true
    }
    current = 'cause' in current ? current.cause : undefined
  }
  return false
}
