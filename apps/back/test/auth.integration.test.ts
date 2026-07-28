import { authSessions, otpChallenges, users } from '@movilis/db'
import {
  apiErrorSchema,
  authSessionSchema,
  privateUserSchema,
  requestOtpResponseSchema,
  verifyOtpResponseSchema,
} from '@movilis/shared'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { createHmac, randomUUID } from 'node:crypto'
import { safeParse } from 'valibot'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthSecurityConfig } from '../config.js'
import { authService } from '../modules/auth/auth.service.js'
import type { SmsSender } from '../modules/auth/sms.sender.js'
import {
  accessToken,
  completeSignup,
  createIntegrationApp,
  requestOtp,
  seedCity,
  seedUser,
} from './fixtures.js'
import { testDb, testPool } from './database.js'
import { createTestAuthConfig } from './auth-config.js'

describe.sequential('authentication endpoint contracts', () => {
  let app: FastifyInstance

  async function replaceApp(options: {
    authConfig?: Partial<AuthSecurityConfig>
    smsSender?: SmsSender
    trustedProxies?: string[]
  }) {
    await app.close()
    app = await createIntegrationApp(options)
  }

  beforeEach(async () => {
    app = await createIntegrationApp()
  })

  afterEach(async () => {
    vi.useRealTimers()
    await app.close()
  })

  it('POST /auth/otp/request returns its shared success contract', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/otp/request',
      payload: { phoneNumber: '+541140392404' },
    })
    expect(response.statusCode).toBe(200)
    expect(safeParse(requestOtpResponseSchema, response.json()).success).toBe(true)
    expect(response.json()).toMatchObject({ expiresInSeconds: 600 })
  })

  it('persists a pending challenge until the provider accepts it', async () => {
    const delivery = deferred<{ providerMessageId: string }>()
    const sendOtp = vi.fn<SmsSender['sendOtp']>(() => delivery.promise)
    await replaceApp({ smsSender: { sendOtp } })

    const responsePromise = app.inject(otpRequest({ deviceId: 'install-1' }))
    const pending = await waitForChallengeStatus('+541140392404', 'pending')

    expect(pending.providerMessageId).toBeNull()
    expect(pending.identifierHash).not.toBe('+541140392404')
    expect(pending.ipHash).not.toBe('127.0.0.1')
    expect(pending.deviceHash).not.toBe('install-1')

    delivery.resolve({ providerMessageId: 'SM1' })
    expect((await responsePromise).statusCode).toBe(200)
    const [deliverable] = await testDb
      .select()
      .from(otpChallenges)
      .where(eq(otpChallenges.id, pending.id))
    expect(deliverable).toMatchObject({
      status: 'deliverable',
      providerMessageId: 'SM1',
    })
  })

  it('starts the OTP lifetime only after admission locks are acquired', async () => {
    const initial = new Date('2026-07-28T12:00:00.000Z')
    const admitted = new Date('2026-07-28T12:02:00.000Z')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(initial)
    const phoneNumber = '+541140392404'
    const identifierHash = rateHash(
      'test-rate-limit-hmac-secret',
      'phone',
      phoneNumber,
    )
    const lockKey = BigInt.asIntN(
      64,
      BigInt(`0x${identifierHash.slice(0, 16)}`),
    )
    const lockClient = await testPool.connect()
    await lockClient.query('BEGIN')
    await lockClient.query('select pg_advisory_xact_lock($1)', [
      lockKey.toString(),
    ])

    try {
      const request = authService.requestOtp(
        testDb,
        immediateSender,
        { phoneNumber, ipAddress: '203.0.113.10' },
        createTestAuthConfig({ otpTtlSeconds: 600 }),
      )
      await testPool.query('select pg_sleep(0.05)')
      vi.setSystemTime(admitted)
      await lockClient.query('COMMIT')

      const result = await request
      expect(result.expiresAt).toEqual(
        new Date(admitted.getTime() + 600_000),
      )
      expect(result.expiresInSeconds).toBe(600)
    } finally {
      await lockClient.query('ROLLBACK')
      lockClient.release()
    }
  })

  it('returns the actual remaining lifetime after provider delay', async () => {
    const now = new Date('2026-07-28T12:00:00.000Z')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now)
    const delivery = deferred<{ providerMessageId: string }>()
    await replaceApp({ smsSender: { sendOtp: () => delivery.promise } })

    const responsePromise = app.inject(otpRequest())
    const pending = await waitForChallengeStatus('+541140392404', 'pending')
    vi.setSystemTime(new Date(now.getTime() + 100_000))
    delivery.resolve({ providerMessageId: 'SM1' })

    const response = await responsePromise
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ expiresInSeconds: 500 })
    expect(pending.expiresAt).toEqual(new Date(now.getTime() + 600_000))
  })

  it('makes an accepted delivery unusable when no lifetime remains', async () => {
    const now = new Date('2026-07-28T12:00:00.000Z')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now)
    const delivery = deferred<{ providerMessageId: string }>()
    let deliveredCode = ''
    await replaceApp({
      authConfig: { otpTtlSeconds: 1 },
      smsSender: {
        sendOtp({ code }) {
          deliveredCode = code
          return delivery.promise
        },
      },
    })

    const responsePromise = app.inject(otpRequest())
    const pending = await waitForChallengeStatus('+541140392404', 'pending')
    vi.setSystemTime(new Date(now.getTime() + 2_000))
    delivery.resolve({ providerMessageId: 'SM1' })

    const response = await responsePromise
    expect(response.statusCode).toBe(503)
    expect(response.json()).toMatchObject({ code: 'SMS_DELIVERY_FAILED' })
    const [challenge] = await testDb
      .select()
      .from(otpChallenges)
      .where(eq(otpChallenges.id, pending.id))
    expect(challenge).toMatchObject({
      status: 'delivery_failed',
      providerMessageId: null,
      terminalAt: new Date(now.getTime() + 2_000),
    })
    expectInvalidOtp(
      await verifyOtp(app, '+541140392404', deliveredCode),
    )
  })

  it('marks a pending challenge delivery_failed when the provider rejects it', async () => {
    const sendOtp = vi.fn<SmsSender['sendOtp']>().mockRejectedValue(
      new Error('provider details must not escape'),
    )
    await replaceApp({ smsSender: { sendOtp } })

    const response = await app.inject(otpRequest({ deviceId: 'install-1' }))

    expect(response.statusCode).toBe(503)
    expect(response.json()).toMatchObject({
      code: 'SMS_DELIVERY_FAILED',
      message: 'SMS delivery failed',
    })
    expect(response.body).not.toContain('provider details must not escape')
    const [challenge] = await testDb.select().from(otpChallenges)
    expect(challenge.status).toBe('delivery_failed')
    expect(challenge.terminalAt).not.toBeNull()
    expect(challenge.providerMessageId).toBeNull()
  })

  it('enforces the configured per-phone resend cooldown', async () => {
    const sendOtp = vi.fn<SmsSender['sendOtp']>().mockResolvedValue({
      providerMessageId: 'SM1',
    })
    await replaceApp({ smsSender: { sendOtp } })

    expect((await app.inject(otpRequest())).statusCode).toBe(200)
    const response = await app.inject(otpRequest())

    expect(response.statusCode).toBe(429)
    expect(response.json()).toMatchObject({ code: 'RATE_LIMITED' })
    expect(sendOtp).toHaveBeenCalledTimes(1)
  })

  it('allows a request at the exact resend-cooldown boundary', async () => {
    const now = new Date('2026-07-27T12:00:00.000Z')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now)
    await seedChallenge({
      phoneNumber: '+541140392404',
      identifierHash: rateHash(
        'integration-rate-limit-secret',
        'phone',
        '+541140392404',
      ),
      createdAt: new Date(now.getTime() - 60_000),
    })

    const response = await app.inject(otpRequest())

    expect(response.statusCode).toBe(200)
  })

  it('enforces the rolling phone limit independently of cooldown', async () => {
    const sendOtp = vi.fn<SmsSender['sendOtp']>().mockResolvedValue({
      providerMessageId: 'SM1',
    })
    await replaceApp({
      authConfig: { phoneWindowMaxRequests: 2 },
      smsSender: { sendOtp },
    })

    for (let request = 0; request < 2; request += 1) {
      expect((await app.inject(otpRequest())).statusCode).toBe(200)
      await testDb
        .update(otpChallenges)
        .set({ createdAt: new Date(Date.now() - 61_000) })
        .where(eq(otpChallenges.phoneNumber, '+541140392404'))
    }

    const response = await app.inject(otpRequest())
    expect(response.statusCode).toBe(429)
    expect(sendOtp).toHaveBeenCalledTimes(2)
  })

  it('allows a request at the exact rolling-window boundary', async () => {
    const now = new Date('2026-07-27T12:00:00.000Z')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now)
    await seedChallenge({
      phoneNumber: '+541140392404',
      identifierHash: rateHash(
        'integration-rate-limit-secret',
        'phone',
        '+541140392404',
      ),
      createdAt: new Date(now.getTime() - 15 * 60_000),
    })
    await replaceApp({ authConfig: { phoneWindowMaxRequests: 1 } })

    const response = await app.inject(otpRequest())

    expect(response.statusCode).toBe(200)
  })

  it.each([
    'pending',
    'deliverable',
    'consumed',
    'superseded',
    'delivery_failed',
  ] as const)('counts an isolated %s row toward the phone window', async (status) => {
    const phoneNumber = '+541140392404'
    await seedChallenge({
      phoneNumber,
      identifierHash: rateHash(
        'integration-rate-limit-secret',
        'phone',
        phoneNumber,
      ),
      status,
      createdAt: new Date(Date.now() - 2 * 60_000),
      consumedAt: status === 'consumed' ? new Date() : null,
    })
    await replaceApp({ authConfig: { phoneWindowMaxRequests: 1 } })

    const response = await app.inject(otpRequest({ phoneNumber }))

    expect(response.statusCode).toBe(429)
    expect(response.json()).toMatchObject({ code: 'RATE_LIMITED' })
    expect(await testDb.select().from(otpChallenges)).toHaveLength(1)
  })

  it('enforces the rolling source-IP limit across phone numbers', async () => {
    await replaceApp({
      authConfig: { ipWindowMaxRequests: 2, phoneWindowMaxRequests: 10 },
    })

    expect(
      (await app.inject(otpRequest({ phoneNumber: '+541140392401' })))
        .statusCode,
    ).toBe(200)
    expect(
      (await app.inject(otpRequest({ phoneNumber: '+541140392402' })))
        .statusCode,
    ).toBe(200)
    const response = await app.inject(
      otpRequest({ phoneNumber: '+541140392403' }),
    )

    expect(response.statusCode).toBe(429)
    expect(response.json()).toMatchObject({ code: 'RATE_LIMITED' })
  })

  it('reads X-Device-ID case-insensitively and enforces its rolling limit', async () => {
    await replaceApp({
      authConfig: {
        deviceWindowMaxRequests: 1,
        ipWindowMaxRequests: 10,
        phoneWindowMaxRequests: 10,
      },
    })

    expect(
      (
        await app.inject({
          ...otpRequest({ phoneNumber: '+541140392401' }),
          headers: { 'X-DEVICE-ID': 'install-1' },
        })
      ).statusCode,
    ).toBe(200)
    const response = await app.inject({
      ...otpRequest({ phoneNumber: '+541140392402' }),
      headers: { 'x-DeViCe-Id': 'install-1' },
    })

    expect(response.statusCode).toBe(429)
  })

  it('accepts requests without a device identifier and stores no device hash', async () => {
    const response = await app.inject(otpRequest())

    expect(response.statusCode).toBe(200)
    const [challenge] = await testDb.select().from(otpChallenges)
    expect(challenge.deviceHash).toBeNull()
  })

  it('supersedes a delayed request without reviving it after provider acceptance', async () => {
    const firstDelivery = deferred<{ providerMessageId: string }>()
    const sendOtp = vi
      .fn<SmsSender['sendOtp']>()
      .mockReturnValueOnce(firstDelivery.promise)
      .mockResolvedValueOnce({ providerMessageId: 'SM2' })
    await replaceApp({ smsSender: { sendOtp } })

    const firstPromise = app.inject(otpRequest({ deviceId: 'install-1' }))
    const firstChallenge = await waitForChallengeStatus(
      '+541140392404',
      'pending',
    )
    await testDb
      .update(otpChallenges)
      .set({ createdAt: new Date(Date.now() - 61_000) })
      .where(eq(otpChallenges.id, firstChallenge.id))

    const second = await app.inject(otpRequest({ deviceId: 'install-1' }))
    firstDelivery.resolve({ providerMessageId: 'SM1' })
    const first = await firstPromise

    expect(first.statusCode).toBe(409)
    expect(first.json()).toMatchObject({ code: 'OTP_SUPERSEDED' })
    expect(second.statusCode).toBe(200)
    const challenges = await testDb.select().from(otpChallenges)
    expect(challenges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: firstChallenge.id,
          status: 'superseded',
          terminalAt: expect.any(Date),
          providerMessageId: null,
        }),
        expect.objectContaining({
          status: 'deliverable',
          providerMessageId: 'SM2',
        }),
      ]),
    )
  })

  it('does not overwrite a superseded challenge after delayed provider rejection', async () => {
    const firstDelivery = deferred<{ providerMessageId: string }>()
    const sendOtp = vi
      .fn<SmsSender['sendOtp']>()
      .mockReturnValueOnce(firstDelivery.promise)
      .mockResolvedValueOnce({ providerMessageId: 'SM2' })
    await replaceApp({ smsSender: { sendOtp } })

    const firstPromise = app.inject(otpRequest({ deviceId: 'install-1' }))
    const firstChallenge = await waitForChallengeStatus(
      '+541140392404',
      'pending',
    )
    await testDb
      .update(otpChallenges)
      .set({ createdAt: new Date(Date.now() - 61_000) })
      .where(eq(otpChallenges.id, firstChallenge.id))

    expect(
      (await app.inject(otpRequest({ deviceId: 'install-1' }))).statusCode,
    ).toBe(200)
    firstDelivery.reject(new Error('delayed provider rejection'))
    expect((await firstPromise).statusCode).toBe(503)

    const [superseded] = await testDb
      .select()
      .from(otpChallenges)
      .where(eq(otpChallenges.id, firstChallenge.id))
    expect(superseded).toMatchObject({
      status: 'superseded',
      terminalAt: expect.any(Date),
      providerMessageId: null,
    })
  })

  it('serializes overlapping same-IP admissions at the configured limit', async () => {
    await replaceApp({
      authConfig: {
        ipWindowMaxRequests: 3,
        phoneWindowMaxRequests: 10,
      },
    })
    await testPool.query(`
      DROP TRIGGER IF EXISTS test_overlap_otp_insert ON otp_challenges;
      DROP FUNCTION IF EXISTS test_overlap_otp_insert();
      CREATE FUNCTION test_overlap_otp_insert() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM pg_sleep(0.5);
        RETURN NEW;
      END;
      $$;
      CREATE TRIGGER test_overlap_otp_insert
      BEFORE INSERT ON otp_challenges
      FOR EACH ROW EXECUTE FUNCTION test_overlap_otp_insert();
    `)

    try {
      const responses = await Promise.all(
        Array.from({ length: 8 }, (_, index) =>
          app.inject(
            otpRequest({
              phoneNumber: `+5411403924${index.toString().padStart(2, '0')}`,
            }),
          ),
        ),
      )

      expect(
        responses.filter(({ statusCode }) => statusCode === 200),
      ).toHaveLength(3)
      expect(
        responses.filter(({ statusCode }) => statusCode === 429),
      ).toHaveLength(5)
      expect(await testDb.select().from(otpChallenges)).toHaveLength(3)
    } finally {
      await testPool.query(`
        DROP TRIGGER IF EXISTS test_overlap_otp_insert ON otp_challenges;
        DROP FUNCTION IF EXISTS test_overlap_otp_insert();
      `)
    }
  })

  it('domain-separates phone, IP, and device hashes for equal input', async () => {
    const identifier = '+541140392404'
    await authService.requestOtp(
      testDb,
      immediateSender,
      {
        phoneNumber: identifier,
        ipAddress: identifier,
        deviceId: identifier,
      },
      createTestAuthConfig(),
    )

    const [challenge] = await testDb.select().from(otpChallenges)
    expect(
      new Set([
        challenge.identifierHash,
        challenge.ipHash,
        challenge.deviceHash,
      ]).size,
    ).toBe(3)
  })

  it('changes persisted identifier hashes when the rate HMAC secret changes', async () => {
    const context = {
      phoneNumber: '+541140392404',
      ipAddress: '203.0.113.10',
      deviceId: 'install-1',
    }
    await authService.requestOtp(
      testDb,
      immediateSender,
      context,
      createTestAuthConfig({ rateLimitHmacSecret: 'rate-secret-a' }),
    )
    await authService.requestOtp(
      testDb,
      immediateSender,
      context,
      createTestAuthConfig({ rateLimitHmacSecret: 'rate-secret-b' }),
    )

    const challenges = await testDb.select().from(otpChallenges)
    const first = challenges.find(({ status }) => status === 'superseded')
    const second = challenges.find(({ status }) => status === 'deliverable')
    expect(first).toBeDefined()
    expect(second).toBeDefined()
    expect(first?.identifierHash).not.toBe(second?.identifierHash)
    expect(first?.ipHash).not.toBe(second?.ipHash)
    expect(first?.deviceHash).not.toBe(second?.deviceHash)
  })

  it('binds a persisted code hash to the configured OTP HMAC secret', async () => {
    let deliveredCode = ''
    const sender: SmsSender = {
      async sendOtp({ code }) {
        deliveredCode = code
        return { providerMessageId: 'SM1' }
      },
    }
    const phoneNumber = '+541140392404'
    const configuredSecret = 'otp-secret-a'
    await authService.requestOtp(
      testDb,
      sender,
      {
        phoneNumber,
        ipAddress: '203.0.113.10',
        deviceId: 'install-1',
      },
      createTestAuthConfig({ otpCodeHmacSecret: configuredSecret }),
    )

    const [challenge] = await testDb.select().from(otpChallenges)
    const stableInput = `${challenge.id}:${challenge.purpose}:${phoneNumber}:${deliveredCode}`
    const configuredHash = createHmac('sha256', configuredSecret)
      .update(stableInput)
      .digest('hex')
    const changedSecretHash = createHmac('sha256', 'otp-secret-b')
      .update(stableInput)
      .digest('hex')

    expect(challenge.codeHash).toBe(configuredHash)
    expect(changedSecretHash).not.toBe(configuredHash)
    expect(challenge.codeHash).not.toBe(changedSecretHash)
  })

  it('returns a field path for an invalid OTP request', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/otp/request',
      payload: { phoneNumber: '1140392404' },
    })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: { fields: [{ path: 'body.phoneNumber' }] },
    })
    expect(safeParse(apiErrorSchema, response.json()).success).toBe(true)
  })

  it('POST /auth/otp/verify returns signup_required', async () => {
    const { devCode } = await requestOtp(app)
    const response = await app.inject({ method: 'POST', url: '/auth/otp/verify', payload: { phoneNumber: '+541140392404', code: devCode } })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ status: 'signup_required' })
    expect(safeParse(verifyOtpResponseSchema, response.json()).success).toBe(true)
  })

  it('POST /auth/otp/verify returns authenticated with a private user', async () => {
    await seedCity()
    await seedUser('city-1')
    const { devCode } = await requestOtp(app)
    const response = await app.inject({ method: 'POST', url: '/auth/otp/verify', payload: { phoneNumber: '+541140392404', code: devCode } })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ status: 'authenticated', user: { id: 'user-1', phoneNumber: '+541140392404' } })
    expect(safeParse(verifyOtpResponseSchema, response.json()).success).toBe(true)
    expect(response.body).not.toContain('createdAt')
    expect(response.body).not.toContain('deletedAt')
  })

  it('maps an invalid OTP to INVALID_OTP', async () => {
    await requestOtp(app)
    const response = await app.inject({ method: 'POST', url: '/auth/otp/verify', payload: { phoneNumber: '+541140392404', code: '000000' } })
    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({ code: 'INVALID_OTP' })
  })

  it('does not verify a deliverable challenge for another purpose', async () => {
    const phoneNumber = '+541140392404'
    const code = '123456'
    await seedVerifiableChallenge({
      phoneNumber,
      code,
      purpose: 'account_deletion',
    })

    const response = await verifyOtp(app, phoneNumber, code)

    expectInvalidOtp(response)
  })

  it.each([
    'pending',
    'consumed',
    'superseded',
    'delivery_failed',
  ] as const)('does not verify a %s login challenge', async (status) => {
    const phoneNumber = '+541140392404'
    const code = '123456'
    const challenge = await seedVerifiableChallenge({
      phoneNumber,
      code,
      status,
      consumedAt: status === 'consumed' ? new Date() : null,
    })

    const response = await verifyOtp(app, phoneNumber, code)

    expectInvalidOtp(response)
    const [stored] = await testDb
      .select()
      .from(otpChallenges)
      .where(eq(otpChallenges.id, challenge.id))
    expect(stored.attempts).toBe(0)
  })

  it('does not verify an expired deliverable challenge', async () => {
    const phoneNumber = '+541140392404'
    const code = '123456'
    await seedVerifiableChallenge({
      phoneNumber,
      code,
      expiresAt: new Date(Date.now() - 1),
    })

    const response = await verifyOtp(app, phoneNumber, code)

    expectInvalidOtp(response)
  })

  it('does not verify a deliverable challenge that was already consumed', async () => {
    const phoneNumber = '+541140392404'
    const code = '123456'
    await seedVerifiableChallenge({
      phoneNumber,
      code,
      consumedAt: new Date(),
    })

    const response = await verifyOtp(app, phoneNumber, code)

    expectInvalidOtp(response)
  })

  it('verifies only the latest deliverable login challenge', async () => {
    const phoneNumber = '+541140392404'
    const older = await seedVerifiableChallenge({
      phoneNumber,
      code: '111111',
      createdAt: new Date(Date.now() - 1_000),
    })
    const latest = await seedVerifiableChallenge({
      phoneNumber,
      code: '222222',
      createdAt: new Date(),
    })

    expectInvalidOtp(await verifyOtp(app, phoneNumber, '111111'))
    const challenges = await testDb.select().from(otpChallenges)
    expect(challenges.find(({ id }) => id === older.id)?.attempts).toBe(0)
    expect(challenges.find(({ id }) => id === latest.id)?.attempts).toBe(1)

    const response = await verifyOtp(app, phoneNumber, '222222')
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ status: 'signup_required' })
  })

  it('consumes at the configured maximum under concurrent wrong attempts', async () => {
    await replaceApp({ authConfig: { maxOtpAttempts: 2 } })
    const { devCode } = await requestOtp(app)
    const wrongCode = devCode === '000000' ? '111111' : '000000'
    await installOtpUpdateDelay()

    let responses
    try {
      responses = await Promise.all(
        Array.from({ length: 2 }, () =>
          app.inject({
            method: 'POST',
            url: '/auth/otp/verify',
            payload: { phoneNumber: '+541140392404', code: wrongCode },
          }),
        ),
      )
    } finally {
      await removeOtpUpdateDelay()
    }
    expect(responses.every(({ statusCode }) => statusCode === 401)).toBe(true)

    const valid = await app.inject({
      method: 'POST',
      url: '/auth/otp/verify',
      payload: { phoneNumber: '+541140392404', code: devCode },
    })
    expect(valid.statusCode).toBe(401)
    const [challenge] = await testDb
      .select()
      .from(otpChallenges)
      .where(eq(otpChallenges.phoneNumber, '+541140392404'))
    expect(challenge.attempts).toBe(2)
    expect(challenge.consumedAt).not.toBeNull()
    expect(challenge.terminalAt).not.toBeNull()
    expect(challenge.status).toBe('consumed')
  })

  it('claims a valid OTP once when issuing an onboarding token', async () => {
    const { devCode } = await requestOtp(app)
    await installOtpUpdateDelay()
    let responses
    try {
      responses = await Promise.all(
        Array.from({ length: 2 }, () =>
          app.inject({
            method: 'POST',
            url: '/auth/otp/verify',
            payload: { phoneNumber: '+541140392404', code: devCode },
          }),
        ),
      )
    } finally {
      await removeOtpUpdateDelay()
    }
    expect(responses.map(({ statusCode }) => statusCode).sort()).toEqual([200, 401])
    const [challenge] = await testDb.select().from(otpChallenges)
    expect(challenge).toMatchObject({ status: 'consumed' })
    expect(challenge.consumedAt).not.toBeNull()
    expect(challenge.terminalAt).not.toBeNull()
  })

  it('claims a valid OTP once when issuing an authenticated session', async () => {
    await seedCity()
    await seedUser('city-1')
    const { devCode } = await requestOtp(app)
    await installOtpUpdateDelay()
    let responses
    try {
      responses = await Promise.all(
        Array.from({ length: 2 }, () =>
          app.inject({
            method: 'POST',
            url: '/auth/otp/verify',
            payload: { phoneNumber: '+541140392404', code: devCode },
          }),
        ),
      )
    } finally {
      await removeOtpUpdateDelay()
    }
    expect(responses.map(({ statusCode }) => statusCode).sort()).toEqual([200, 401])
    const sessions = await testDb.select().from(authSessions)
    expect(sessions).toHaveLength(1)
    const [challenge] = await testDb.select().from(otpChallenges)
    expect(challenge).toMatchObject({ status: 'consumed' })
    expect(challenge.consumedAt).not.toBeNull()
    expect(challenge.terminalAt).not.toBeNull()
  })

  it('rolls back OTP consumption when authenticated session creation fails', async () => {
    const phoneNumber = '+541140392404'
    await seedCity()
    await seedUser('city-1', 'user-1', phoneNumber)
    const { devCode } = await requestOtp(app, phoneNumber)
    await testPool.query(`
      DROP TRIGGER IF EXISTS test_fail_auth_session_insert ON auth_sessions;
      DROP FUNCTION IF EXISTS test_fail_auth_session_insert();
      CREATE FUNCTION test_fail_auth_session_insert() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'forced auth session insert failure';
      END;
      $$;
      CREATE TRIGGER test_fail_auth_session_insert
      BEFORE INSERT ON auth_sessions
      FOR EACH ROW EXECUTE FUNCTION test_fail_auth_session_insert();
    `)

    try {
      const response = await verifyOtp(app, phoneNumber, devCode)

      expect(response.statusCode).toBe(500)
      const [challenge] = await testDb
        .select()
        .from(otpChallenges)
        .where(eq(otpChallenges.phoneNumber, phoneNumber))
      expect(challenge).toMatchObject({ attempts: 0, status: 'deliverable' })
      expect(challenge.consumedAt).toBeNull()
      expect(challenge.terminalAt).toBeNull()
      expect(await testDb.select().from(authSessions)).toHaveLength(0)
    } finally {
      await testPool.query(`
        DROP TRIGGER IF EXISTS test_fail_auth_session_insert ON auth_sessions;
        DROP FUNCTION IF EXISTS test_fail_auth_session_insert();
      `)
    }

    const retry = await verifyOtp(app, phoneNumber, devCode)
    expect(retry.statusCode).toBe(200)
    expect(retry.json()).toMatchObject({ status: 'authenticated' })
  })

  it('POST /auth/signup/complete returns AuthSession', async () => {
    await seedCity()
    const response = await completeSignup(app, 'city-1')
    expect(response.statusCode).toBe(200)
    expect(safeParse(authSessionSchema, response.json()).success).toBe(true)
  })

  it.each([
    ['invalid token', { onboardingToken: 'invalid', fullName: 'Ada', cityId: 'city-1' }, 401, 'INVALID_ONBOARDING_TOKEN'],
    ['missing city', { onboardingToken: '', fullName: 'Ada', cityId: 'absent' }, 404, 'CITY_NOT_FOUND'],
  ] as const)('maps signup domain failure: %s', async (_name, payload, status, code) => {
    await seedCity()
    const onboardingToken = payload.onboardingToken || app.jwt.sign({ phoneNumber: '+541140392404', tokenType: 'onboarding' })
    const response = await app.inject({ method: 'POST', url: '/auth/signup/complete', payload: { ...payload, onboardingToken } })
    expect(response.statusCode).toBe(status)
    expect(response.json()).toMatchObject({ code })
  })

  it('maps duplicate signup to USER_ALREADY_EXISTS', async () => {
    await seedCity()
    await seedUser('city-1')
    const onboardingToken = app.jwt.sign({ phoneNumber: '+541140392404', tokenType: 'onboarding' })
    const response = await app.inject({ method: 'POST', url: '/auth/signup/complete', payload: { onboardingToken, fullName: 'Ada', cityId: 'city-1' } })
    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({ code: 'USER_ALREADY_EXISTS' })
  })

  it('maps a concurrent signup unique violation to USER_ALREADY_EXISTS', async () => {
    await seedCity()
    const onboardingToken = app.jwt.sign({
      phoneNumber: '+541140392404',
      tokenType: 'onboarding',
    })
    const responses = await Promise.all(
      Array.from({ length: 2 }, () =>
        app.inject({
          method: 'POST',
          url: '/auth/signup/complete',
          payload: { onboardingToken, fullName: 'Ada', cityId: 'city-1' },
        }),
      ),
    )

    expect(responses.map(({ statusCode }) => statusCode).sort()).toEqual([200, 409])
    expect(responses.find(({ statusCode }) => statusCode === 409)?.json()).toMatchObject({
      code: 'USER_ALREADY_EXISTS',
      message: 'User already exists',
    })
  })

  it('rolls back the user when initial refresh-session creation fails', async () => {
    await seedCity()
    await testPool.query(`
      DROP TRIGGER IF EXISTS test_fail_auth_session_insert ON auth_sessions;
      DROP FUNCTION IF EXISTS test_fail_auth_session_insert();
      CREATE FUNCTION test_fail_auth_session_insert() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'forced auth session insert failure';
      END;
      $$;
      CREATE TRIGGER test_fail_auth_session_insert
      BEFORE INSERT ON auth_sessions
      FOR EACH ROW EXECUTE FUNCTION test_fail_auth_session_insert();
    `)

    try {
      const onboardingToken = app.jwt.sign({
        phoneNumber: '+541140392404',
        tokenType: 'onboarding',
      })
      const response = await app.inject({
        method: 'POST',
        url: '/auth/signup/complete',
        payload: { onboardingToken, fullName: 'Ada', cityId: 'city-1' },
      })

      expect(response.statusCode).toBe(500)
      const createdUsers = await testDb
        .select()
        .from(users)
        .where(eq(users.phoneNumber, '+541140392404'))
      expect(createdUsers).toHaveLength(0)
    } finally {
      await testPool.query(`
        DROP TRIGGER IF EXISTS test_fail_auth_session_insert ON auth_sessions;
        DROP FUNCTION IF EXISTS test_fail_auth_session_insert();
      `)
    }
  })

  it('POST /auth/refresh rotates a session and rejects reuse', async () => {
    await seedCity()
    const signup = await completeSignup(app, 'city-1')
    const original = signup.json<{ refreshToken: string }>().refreshToken
    const refreshed = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken: original } })
    expect(refreshed.statusCode).toBe(200)
    expect(safeParse(authSessionSchema, refreshed.json()).success).toBe(true)
    const replacement = refreshed.json<{ refreshToken: string }>().refreshToken
    expect(replacement).not.toBe(original)
    const reused = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken: original } })
    expect(reused.statusCode).toBe(401)
    const error = reused.json()
    expect(error).toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
      requestId: expect.any(String),
    })
    expect(safeParse(apiErrorSchema, error).success).toBe(true)
    expect(reused.headers['x-request-id']).toBe(error.requestId)

    const revokedReplacement = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: replacement },
    })
    expect(revokedReplacement.statusCode).toBe(401)
    expect(revokedReplacement.json()).toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
    })
  })

  it('POST /auth/logout returns 204 and revokes the refresh token', async () => {
    await seedCity()
    const signup = await completeSignup(app, 'city-1')
    const refreshToken = signup.json<{ refreshToken: string }>().refreshToken
    const logout = await app.inject({ method: 'POST', url: '/auth/logout', payload: { refreshToken } })
    expect(logout.statusCode).toBe(204)
    expect(logout.body).toBe('')
    const refresh = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken } })
    expect(refresh.statusCode).toBe(401)
  })

  it('POST /auth/logout-all requires access authentication', async () => {
    const response = await app.inject({ method: 'POST', url: '/auth/logout-all' })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({ code: 'UNAUTHENTICATED' })
  })

  it('POST /auth/logout-all rejects a soft-deleted user without revoking sessions', async () => {
    await seedCity()
    await seedUser('city-1')
    await testDb.insert(authSessions).values(sessionValues('deleted-user-session', 'user-1'))
    await testDb
      .update(users)
      .set({ deletedAt: new Date('2026-07-28T12:00:00.000Z') })
      .where(eq(users.id, 'user-1'))

    const response = await app.inject({
      method: 'POST',
      url: '/auth/logout-all',
      headers: { authorization: `Bearer ${accessToken(app, 'user-1')}` },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({ code: 'UNAUTHENTICATED' })
    const [session] = await testDb
      .select()
      .from(authSessions)
      .where(eq(authSessions.id, 'deleted-user-session'))
    expect(session.revokedAt).toBeNull()
  })

  it('POST /auth/logout-all returns an empty 204 and revokes only the user active sessions', async () => {
    await seedCity()
    await seedUser('city-1')
    await seedUser('city-1', 'user-2', '+541140392405')
    const priorRevocation = new Date('2026-07-27T12:00:00.000Z')
    await testDb.insert(authSessions).values([
      sessionValues('active-1', 'user-1'),
      sessionValues('active-2', 'user-1'),
      sessionValues('already-revoked', 'user-1', priorRevocation),
      sessionValues('other-user-active', 'user-2'),
    ])

    const response = await app.inject({
      method: 'POST',
      url: '/auth/logout-all',
      headers: { authorization: `Bearer ${accessToken(app, 'user-1')}` },
    })

    expect(response.statusCode).toBe(204)
    expect(response.body).toBe('')
    const sessions = await testDb.select().from(authSessions)
    expect(sessions.find(({ id }) => id === 'active-1')?.revokedAt).not.toBeNull()
    expect(sessions.find(({ id }) => id === 'active-2')?.revokedAt).not.toBeNull()
    expect(sessions.find(({ id }) => id === 'already-revoked')?.revokedAt).toEqual(
      priorRevocation,
    )
    expect(sessions.find(({ id }) => id === 'other-user-active')?.revokedAt).toBeNull()
  })

  it('POST /auth/logout-all is idempotent', async () => {
    await seedCity()
    await seedUser('city-1')
    await testDb.insert(authSessions).values(sessionValues('active-1', 'user-1'))
    const authorization = `Bearer ${accessToken(app, 'user-1')}`

    const first = await app.inject({
      method: 'POST',
      url: '/auth/logout-all',
      headers: { authorization },
    })
    const [afterFirst] = await testDb
      .select()
      .from(authSessions)
      .where(eq(authSessions.id, 'active-1'))
    const second = await app.inject({
      method: 'POST',
      url: '/auth/logout-all',
      headers: { authorization },
    })
    const [afterSecond] = await testDb
      .select()
      .from(authSessions)
      .where(eq(authSessions.id, 'active-1'))

    expect(first.statusCode).toBe(204)
    expect(second.statusCode).toBe(204)
    expect(second.body).toBe('')
    expect(afterSecond.revokedAt).toEqual(afterFirst.revokedAt)
  })

  it('GET /auth/me returns only PrivateUser fields', async () => {
    await seedCity()
    const signup = await completeSignup(app, 'city-1')
    const accessToken = signup.json<{ accessToken: string }>().accessToken
    const response = await app.inject({ method: 'GET', url: '/auth/me', headers: { authorization: `Bearer ${accessToken}` } })
    expect(response.statusCode).toBe(200)
    expect(safeParse(privateUserSchema, response.json()).success).toBe(true)
    expect(response.body).not.toContain('createdAt')
    expect(response.body).not.toContain('updatedAt')
    expect(response.body).not.toContain('deletedAt')
  })

  it('GET /auth/me maps absent credentials to UNAUTHENTICATED', async () => {
    const response = await app.inject({ method: 'GET', url: '/auth/me' })
    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({ code: 'UNAUTHENTICATED' })
  })
})

function otpRequest({
  phoneNumber = '+541140392404',
  deviceId,
}: {
  phoneNumber?: string
  deviceId?: string
} = {}) {
  return {
    method: 'POST' as const,
    url: '/auth/otp/request',
    headers: deviceId ? { 'x-device-id': deviceId } : undefined,
    payload: { phoneNumber },
  }
}

function sessionValues(id: string, userId: string, revokedAt: Date | null = null) {
  return {
    id,
    userId,
    refreshTokenHash: `hash-${id}`,
    expiresAt: new Date('2027-07-28T12:00:00.000Z'),
    revokedAt,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const immediateSender: SmsSender = {
  async sendOtp() {
    return { providerMessageId: 'SM1' }
  },
}

function rateHash(
  secret: string,
  dimension: 'phone' | 'ip' | 'device',
  value: string,
) {
  return createHmac('sha256', secret)
    .update(`${dimension}:${value}`)
    .digest('hex')
}

async function seedChallenge({
  phoneNumber,
  identifierHash,
  status = 'deliverable',
  createdAt,
  consumedAt = null,
}: {
  phoneNumber: string
  identifierHash: string
  status?: typeof otpChallenges.$inferInsert.status
  createdAt: Date
  consumedAt?: Date | null
}) {
  await testDb.insert(otpChallenges).values({
    id: randomUUID(),
    phoneNumber,
    codeHash: 'seeded-code-hash',
    purpose: 'login',
    status,
    identifierHash,
    expiresAt: new Date(createdAt.getTime() + 60 * 60_000),
    consumedAt,
    createdAt,
  })
}

async function waitForChallengeStatus(
  phoneNumber: string,
  status: 'pending' | 'deliverable' | 'delivery_failed' | 'superseded',
) {
  const deadline = Date.now() + 2_000
  while (Date.now() < deadline) {
    const challenges = await testDb
      .select()
      .from(otpChallenges)
      .where(eq(otpChallenges.phoneNumber, phoneNumber))
    const challenge = challenges.find(
      (candidate) => candidate.status === status,
    )
    if (challenge) return challenge
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error(`Timed out waiting for ${status} OTP challenge`)
}

async function seedVerifiableChallenge({
  phoneNumber,
  code,
  purpose = 'login',
  status = 'deliverable',
  createdAt = new Date(),
  expiresAt = new Date(Date.now() + 60_000),
  consumedAt = null,
}: {
  phoneNumber: string
  code: string
  purpose?: typeof otpChallenges.$inferInsert.purpose
  status?: typeof otpChallenges.$inferInsert.status
  createdAt?: Date
  expiresAt?: Date
  consumedAt?: Date | null
}) {
  const id = randomUUID()
  const [challenge] = await testDb
    .insert(otpChallenges)
    .values({
      id,
      phoneNumber,
      codeHash: createHmac('sha256', 'integration-otp-secret')
        .update(`${id}:${purpose}:${phoneNumber}:${code}`)
        .digest('hex'),
      purpose,
      status,
      identifierHash: `test:${id}`,
      createdAt,
      expiresAt,
      consumedAt,
    })
    .returning()
  return challenge
}

function verifyOtp(app: FastifyInstance, phoneNumber: string, code: string) {
  return app.inject({
    method: 'POST',
    url: '/auth/otp/verify',
    payload: { phoneNumber, code },
  })
}

function expectInvalidOtp(response: Awaited<ReturnType<FastifyInstance['inject']>>) {
  expect(response.statusCode).toBe(401)
  expect(response.json()).toMatchObject({
    code: 'INVALID_OTP',
    message: 'Invalid or expired OTP code',
  })
}

async function installOtpUpdateDelay() {
  await testPool.query(`
    DROP TRIGGER IF EXISTS test_overlap_otp_update ON otp_challenges;
    DROP FUNCTION IF EXISTS test_overlap_otp_update();
    CREATE FUNCTION test_overlap_otp_update() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      PERFORM pg_sleep(0.15);
      RETURN NEW;
    END;
    $$;
    CREATE TRIGGER test_overlap_otp_update
    BEFORE UPDATE ON otp_challenges
    FOR EACH ROW EXECUTE FUNCTION test_overlap_otp_update();
  `)
}

async function removeOtpUpdateDelay() {
  await testPool.query(`
    DROP TRIGGER IF EXISTS test_overlap_otp_update ON otp_challenges;
    DROP FUNCTION IF EXISTS test_overlap_otp_update();
  `)
}
