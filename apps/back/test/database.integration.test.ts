import { authSessions, cities, otpChallenges } from '@movilis/db'
import { count } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { testDb, testPool } from './database.js'
import {
  accessToken,
  createIntegrationApp,
  requestOtp,
  seedCity,
  seedUser,
} from './fixtures.js'

describe.sequential('PostgreSQL integration harness', () => {
  it('starts from migrated empty application tables', async () => {
    const [{ value }] = await testDb.select({ value: count() }).from(cities)
    expect(value).toBe(0)
  })

  it('allows a test to leave application rows behind', async () => {
    await seedCity()

    const [{ value }] = await testDb.select({ value: count() }).from(cities)
    expect(value).toBe(1)
  })

  it('resets application rows before the next test', async () => {
    const [{ value }] = await testDb.select({ value: count() }).from(cities)
    expect(value).toBe(0)
  })

  it('seeds deterministic cities and users', async () => {
    const city = await seedCity()
    const user = await seedUser(city.id)

    expect(city).toMatchObject({ id: 'city-1', name: 'Buenos Aires' })
    expect(user).toMatchObject({
      id: 'user-1',
      phoneNumber: '+541140392404',
      cityId: city.id,
    })
  })

  it('persists OTP lifecycle context and rejects duplicate refresh hashes', async () => {
    const city = await seedCity()
    const user = await seedUser(city.id)

    const [challenge] = await testDb
      .insert(otpChallenges)
      .values({
        id: randomUUID(),
        phoneNumber: '+541140392404',
        codeHash: 'hmac',
        purpose: 'login',
        status: 'pending',
        identifierHash: 'phone-hash',
        ipHash: 'ip-hash',
        expiresAt: new Date(Date.now() + 60_000),
      })
      .returning()

    expect(challenge).toMatchObject({
      purpose: 'login',
      status: 'pending',
      subjectUserId: null,
      identifierHash: 'phone-hash',
      ipHash: 'ip-hash',
      deviceHash: null,
      providerMessageId: null,
      terminalAt: null,
    })

    const session = {
      userId: user.id,
      refreshTokenHash: 'duplicate-hash',
      expiresAt: new Date(Date.now() + 60_000),
    }
    await testDb.insert(authSessions).values({ id: randomUUID(), ...session })

    await expect(
      testDb
        .insert(authSessions)
        .values({ id: randomUUID(), ...session }),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({ code: '23505' }),
    })
  })

  it('has cleanup indexes matching terminal timestamp expressions and order', async () => {
    const result = await testPool.query<{
      indexname: string
      indexdef: string
    }>(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN (
          'otp_challenges_cleanup_idx',
          'auth_sessions_cleanup_idx'
        )
      ORDER BY indexname
    `)

    expect(result.rows).toHaveLength(2)
    expect(normalizeIndex(result.rows[0]!.indexdef)).toContain(
      'auth_sessions using btree (coalesce(revoked_at, expires_at), id)',
    )
    expect(normalizeIndex(result.rows[1]!.indexdef)).toContain(
      'otp_challenges using btree (coalesce(terminal_at, expires_at), id)',
    )
  })

  it('creates an injectable app and access tokens', async () => {
    const app = await createIntegrationApp()

    try {
      const token = accessToken(app, 'user-1')
      expect(app.jwt.verify(token)).toMatchObject({
        sub: 'user-1',
        tokenType: 'access',
      })
    } finally {
      await app.close()
    }
  })

  it('drives OTP requests through Fastify injection', async () => {
    const app = await createIntegrationApp()

    try {
      const otp = await requestOtp(app)
      expect(otp).toMatchObject({
        expiresInSeconds: 600,
        devCode: expect.stringMatching(/^\d{6}$/),
      })
    } finally {
      await app.close()
    }
  })
})

function normalizeIndex(indexDefinition: string) {
  return indexDefinition.toLowerCase().replaceAll('"', '').replace(/\s+/g, ' ')
}
