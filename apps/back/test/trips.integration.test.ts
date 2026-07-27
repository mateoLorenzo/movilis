import { apiErrorSchema, listMyTripsResponseSchema, ownedTripSchema } from '@movilis/shared'
import type { FastifyInstance } from 'fastify'
import { safeParse } from 'valibot'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  accessToken,
  createIntegrationApp,
  seedCity,
  seedUser,
} from './fixtures.js'

describe.sequential('owned trip endpoint contracts', () => {
  let app: FastifyInstance
  let authorization: string

  beforeEach(async () => {
    app = await createIntegrationApp()
    await seedCity('city-1')
    await seedCity('city-2')
    await seedUser('city-1')
    authorization = `Bearer ${accessToken(app, 'user-1')}`
  })

  afterEach(async () => {
    await app.close()
  })

  function createPayload() {
    return {
      originCityId: 'city-1',
      destinationCityId: 'city-2',
      departureAt: new Date(Date.now() + 86_400_000).toISOString(),
      totalSeats: 4,
      pricePerSeat: { amount: '8500.50', currency: 'ARS' },
      contactPhoneNumber: '+541140392404',
      notes: 'One small bag per passenger',
    }
  }

  it('POST /trips returns OwnedTrip with canonical money and timestamps', async () => {
    const response = await app.inject({ method: 'POST', url: '/trips', headers: { authorization }, payload: createPayload() })
    expect(response.statusCode).toBe(201)
    expect(safeParse(ownedTripSchema, response.json()).success).toBe(true)
    expect(response.json()).toMatchObject({
      driverId: 'user-1',
      availableSeats: 4,
      pricePerSeat: { amount: '8500.50', currency: 'ARS' },
      status: 'scheduled',
    })
    expect(response.json<{ departureAt: string }>().departureAt).toMatch(/Z$/)
  })

  it('GET /trips/mine returns a cursor page ordered newest departure first', async () => {
    const first = createPayload()
    const second = { ...createPayload(), departureAt: new Date(Date.now() + 172_800_000).toISOString(), pricePerSeat: { amount: '9000.00', currency: 'ARS' } }
    await app.inject({ method: 'POST', url: '/trips', headers: { authorization }, payload: first })
    await app.inject({ method: 'POST', url: '/trips', headers: { authorization }, payload: second })
    const response = await app.inject({ method: 'GET', url: '/trips/mine', headers: { authorization } })
    expect(response.statusCode).toBe(200)
    expect(safeParse(listMyTripsResponseSchema, response.json()).success).toBe(true)
    expect(response.json<{ items: Array<{ pricePerSeat: { amount: string } }>; nextCursor: null }>()).toMatchObject({
      items: [
        { pricePerSeat: { amount: '9000.00' } },
        { pricePerSeat: { amount: '8500.50' } },
      ],
      nextCursor: null,
    })
  })

  it('rejects numeric pricePerSeat as VALIDATION_ERROR', async () => {
    const response = await app.inject({ method: 'POST', url: '/trips', headers: { authorization }, payload: { ...createPayload(), pricePerSeat: 8500.5 } })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(safeParse(apiErrorSchema, response.json()).success).toBe(true)
  })

  it('maps a past departure to INVALID_DEPARTURE_TIME', async () => {
    const response = await app.inject({ method: 'POST', url: '/trips', headers: { authorization }, payload: { ...createPayload(), departureAt: '2020-01-01T00:00:00.000Z' } })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ code: 'INVALID_DEPARTURE_TIME' })
  })

  it('maps a missing city to CITY_NOT_FOUND', async () => {
    const response = await app.inject({ method: 'POST', url: '/trips', headers: { authorization }, payload: { ...createPayload(), originCityId: 'absent' } })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ code: 'CITY_NOT_FOUND' })
  })

  it.each([
    ['POST', '/trips'],
    ['GET', '/trips/mine'],
  ] as const)('%s %s requires access credentials', async (method, url) => {
    const response = await app.inject({ method, url, ...(method === 'POST' ? { payload: createPayload() } : {}) })
    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({ code: 'UNAUTHENTICATED' })
  })
})
