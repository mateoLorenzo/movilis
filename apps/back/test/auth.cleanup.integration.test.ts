import { authSessions, otpChallenges } from '@movilis/db'
import { asc } from 'drizzle-orm'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

import { cleanupAuthData } from '../modules/auth/auth.cleanup.js'
import { testDb } from './database.js'
import { seedCity, seedUser } from './fixtures.js'

const execFileAsync = promisify(execFile)

describe.sequential('auth data cleanup', () => {
  it.each([
    ['OTP', 86_399, 2_592_000],
    ['session', 86_400, 2_591_999],
  ])(
    'defensively rejects below-minimum %s retention when called directly',
    async (_retention, otpRetentionSeconds, sessionRetentionSeconds) => {
      await expect(
        cleanupAuthData(testDb, {
          now: new Date('2026-07-28T12:00:00.000Z'),
          batchSize: 1,
          otpRetentionSeconds,
          sessionRetentionSeconds,
        }),
      ).rejects.toThrow('retention must be at least')
    },
  )

  it('deletes only rows before each retention boundary in bounded, idempotent batches', async () => {
    const now = new Date('2026-07-28T12:00:00.000Z')
    const otpRetentionSeconds = 86_400
    const sessionRetentionSeconds = 2_592_000
    const otpBoundary = new Date(now.getTime() - otpRetentionSeconds * 1000)
    const sessionBoundary = new Date(
      now.getTime() - sessionRetentionSeconds * 1000,
    )
    const before = (date: Date, milliseconds: number) =>
      new Date(date.getTime() - milliseconds)
    const after = (date: Date) => new Date(date.getTime() + 1)

    await seedCity()
    await seedUser('city-1')
    await testDb.insert(otpChallenges).values([
      otp('otp-oldest', before(otpBoundary, 3_000)),
      otp('otp-old', before(otpBoundary, 2_000)),
      expiredOtp('otp-before', before(otpBoundary, 1)),
      otp('otp-at', otpBoundary),
      otp('otp-after', after(otpBoundary)),
    ])
    await testDb.insert(authSessions).values([
      session('session-revoked-old', before(sessionBoundary, 3_000), now),
      session('session-expired-old', null, before(sessionBoundary, 2_000)),
      session('session-before', before(sessionBoundary, 1), now),
      session('session-at', sessionBoundary, now),
      session('session-after', null, after(sessionBoundary)),
    ])

    const options = {
      now,
      batchSize: 2,
      otpRetentionSeconds,
      sessionRetentionSeconds,
    }
    const first = await cleanupAuthData(testDb, options)

    expect(first).toEqual({ challengesDeleted: 2, sessionsDeleted: 2 })
    expect(first.challengesDeleted + first.sessionsDeleted).toBeLessThanOrEqual(
      4,
    )

    const second = await cleanupAuthData(testDb, options)
    expect(second).toEqual({ challengesDeleted: 1, sessionsDeleted: 1 })

    const final = await cleanupAuthData(testDb, options)
    expect(final).toEqual({ challengesDeleted: 0, sessionsDeleted: 0 })

    expect(
      await testDb
        .select({ id: otpChallenges.id })
        .from(otpChallenges)
        .orderBy(asc(otpChallenges.id)),
    ).toEqual([{ id: 'otp-after' }, { id: 'otp-at' }])
    expect(
      await testDb
        .select({ id: authSessions.id })
        .from(authSessions)
        .orderBy(asc(authSessions.id)),
    ).toEqual([{ id: 'session-after' }, { id: 'session-at' }])
  })

  it('coordinates concurrent workers without over-counting or exceeding batches', async () => {
    const now = new Date('2026-07-28T12:00:00.000Z')
    await seedCity()
    await seedUser('city-1')
    await testDb.insert(otpChallenges).values(
      Array.from({ length: 6 }, (_, index) =>
        otp(`otp-concurrent-${index}`, new Date('2020-01-01T00:00:00.000Z')),
      ),
    )
    await testDb.insert(authSessions).values(
      Array.from({ length: 6 }, (_, index) =>
        session(
          `session-concurrent-${index}`,
          new Date('2020-01-01T00:00:00.000Z'),
          now,
        ),
      ),
    )
    const options = {
      now,
      batchSize: 2,
      otpRetentionSeconds: 86_400,
      sessionRetentionSeconds: 2_592_000,
    }

    const results = await Promise.all(
      Array.from({ length: 3 }, () => cleanupAuthData(testDb, options)),
    )

    expect(results.every((result) => result.challengesDeleted <= 2)).toBe(true)
    expect(results.every((result) => result.sessionsDeleted <= 2)).toBe(true)
    expect(
      results.reduce((total, result) => total + result.challengesDeleted, 0),
    ).toBe(6)
    expect(
      results.reduce((total, result) => total + result.sessionsDeleted, 0),
    ).toBe(6)
    expect(await testDb.select().from(otpChallenges)).toHaveLength(0)
    expect(await testDb.select().from(authSessions)).toHaveLength(0)
  })

  it('runs with only database and cleanup settings and logs aggregate counts', async () => {
    await testDb.insert(otpChallenges).values(
      otp('private-challenge-id', new Date('2020-01-01T00:00:00.000Z')),
    )

    const { stdout, stderr } = await execFileAsync(
      'pnpm',
      ['--silent', 'auth:cleanup'],
      {
        cwd: new URL('..', import.meta.url),
        env: cleanupEnvironment(process.env.TEST_DATABASE_URL!),
      },
    )

    expect(stderr).toBe('')
    expect(stdout).toMatch(/challengesDeleted[^\d]*1/)
    expect(stdout).toMatch(/sessionsDeleted[^\d]*0/)
    expect(stdout).not.toContain('private-challenge-id')
    expect(stdout).not.toContain('+541100000000')
  })

  it('exits non-zero when cleanup cannot connect to the database', async () => {
    let failure: unknown
    try {
      await execFileAsync('pnpm', ['--silent', 'auth:cleanup'], {
        cwd: new URL('..', import.meta.url),
        env: cleanupEnvironment(
          'postgresql://secret-user:secret-password@127.0.0.1:1/unavailable',
        ),
      })
    } catch (error) {
      failure = error
    }

    expect(failure).toMatchObject({
      code: 1,
      stdout: '',
      stderr: 'Auth cleanup failed\n',
    })
    const stderr = (failure as { stderr: string }).stderr
    for (const secret of [
      'secret-user',
      'secret-password',
      '127.0.0.1',
      'ECONNREFUSED',
      'Error:',
      'at ',
    ]) {
      expect(stderr).not.toContain(secret)
    }
  })
})

function cleanupEnvironment(databaseUrl: string): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    USER: process.env.USER,
    DATABASE_URL: databaseUrl,
    NODE_ENV: 'production',
    AUTH_OTP_RETENTION_SECONDS: '86400',
    AUTH_SESSION_RETENTION_SECONDS: '2592000',
    AUTH_CLEANUP_BATCH_SIZE: '2',
    JWT_SECRET: '',
    OTP_CODE_HMAC_SECRET: '',
    AUTH_RATE_LIMIT_HMAC_SECRET: '',
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    TWILIO_FROM_NUMBER: '',
    TWILIO_MESSAGING_SERVICE_SID: '',
  }
}

function otp(id: string, terminalAt: Date) {
  return {
    id,
    phoneNumber: '+541100000000',
    codeHash: `code-${id}`,
    purpose: 'login' as const,
    status: 'consumed' as const,
    identifierHash: `identifier-${id}`,
    expiresAt: new Date('2026-07-28T13:00:00.000Z'),
    consumedAt: new Date('2020-01-01T00:00:00.000Z'),
    terminalAt,
    createdAt: beforeRetentionWindow(),
  }
}

function expiredOtp(id: string, expiresAt: Date) {
  return {
    ...otp(id, expiresAt),
    status: 'deliverable' as const,
    expiresAt,
    consumedAt: null,
    terminalAt: null,
  }
}

function session(id: string, revokedAt: Date | null, expiresAt: Date) {
  return {
    id,
    userId: 'user-1',
    refreshTokenHash: `hash-${id}`,
    expiresAt,
    revokedAt,
    createdAt: beforeRetentionWindow(),
  }
}

function beforeRetentionWindow() {
  return new Date('2026-01-01T00:00:00.000Z')
}
