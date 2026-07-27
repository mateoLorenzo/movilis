import { cities } from '@movilis/db'
import { count } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { testDb } from './database.js'
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
