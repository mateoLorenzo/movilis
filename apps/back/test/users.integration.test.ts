import { apiErrorSchema, publicUserSchema } from '@movilis/shared'
import type { FastifyInstance } from 'fastify'
import { safeParse } from 'valibot'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createIntegrationApp, seedCity, seedUser } from './fixtures.js'

describe.sequential('GET /users/:id contract', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await createIntegrationApp()
    await seedCity()
  })

  afterEach(async () => {
    await app.close()
  })

  it('returns only PublicUser fields', async () => {
    await seedUser('city-1')
    const response = await app.inject({ method: 'GET', url: '/users/user-1' })
    expect(response.statusCode).toBe(200)
    expect(safeParse(publicUserSchema, response.json()).success).toBe(true)
    expect(response.json()).toEqual({
      id: 'user-1',
      fullName: 'Ada Lovelace',
      profilePhotoUrl: null,
      ratingAverage: 4.5,
      ratingCount: 8,
    })
    expect(response.body).not.toContain('phoneNumber')
    expect(response.body).not.toContain('cityId')
    expect(response.body).not.toContain('createdAt')
    expect(response.body).not.toContain('updatedAt')
    expect(response.body).not.toContain('deletedAt')
  })

  it('returns USER_NOT_FOUND for an absent user', async () => {
    const response = await app.inject({ method: 'GET', url: '/users/absent' })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ code: 'USER_NOT_FOUND' })
    expect(safeParse(apiErrorSchema, response.json()).success).toBe(true)
  })

  it('returns NOT_FOUND for an empty ID path segment', async () => {
    const response = await app.inject({ method: 'GET', url: '/users/' })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ code: 'NOT_FOUND' })
  })
})
