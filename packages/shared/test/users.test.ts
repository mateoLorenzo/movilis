import { describe, expect, it } from 'vitest'
import * as v from 'valibot'

import {
  getMeContract,
  getMeResponseSchema,
  getUserByIdContract,
  getUserByIdParamsSchema,
  privateUserSchema,
  publicUserSchema,
  getUserByIdResponseSchema,
  userIdParamsSchema,
} from '../src/contracts/users.js'
import { apiErrorSchema } from '../src/primitives/error.js'

const publicUser = {
  id: 'user-1',
  fullName: 'Ada Lovelace',
  profilePhotoUrl: 'https://cdn.movilis.test/users/ada.jpg',
  ratingAverage: 4.75,
  ratingCount: 12,
}

describe('publicUserSchema', () => {
  it('accepts only the approved public fields', () => {
    expect(v.parse(publicUserSchema, publicUser)).toEqual(publicUser)
    expect(
      v.parse(publicUserSchema, { ...publicUser, profilePhotoUrl: null }),
    ).toEqual({ ...publicUser, profilePhotoUrl: null })
  })

  it.each([
    { ...publicUser, fullName: '' },
    { ...publicUser, profilePhotoUrl: '/relative/photo.jpg' },
    { ...publicUser, ratingAverage: -0.1 },
    { ...publicUser, ratingAverage: 5.1 },
    { ...publicUser, ratingAverage: Number.POSITIVE_INFINITY },
    { ...publicUser, ratingCount: -1 },
    { ...publicUser, ratingCount: 1.5 },
    { ...publicUser, phoneNumber: '+541140392404' },
    { ...publicUser, createdAt: '2026-07-26T14:30:00Z' },
  ])('rejects an invalid or private public-user shape %#', (value) => {
    expect(v.safeParse(publicUserSchema, value).success).toBe(false)
  })
})

describe('privateUserSchema', () => {
  const privateUser = {
    ...publicUser,
    phoneNumber: '+541140392404',
    cityId: 'city-1',
  }

  it('adds only E.164 phone number and city ID', () => {
    expect(v.parse(privateUserSchema, privateUser)).toEqual(privateUser)
  })

  it.each([
    { ...privateUser, phoneNumber: '1140392404' },
    { ...privateUser, cityId: '' },
    { ...privateUser, deletedAt: null },
    { ...privateUser, updatedAt: '2026-07-26T14:30:00Z' },
  ])('rejects an invalid or persistence-bearing private user %#', (value) => {
    expect(v.safeParse(privateUserSchema, value).success).toBe(false)
  })
})

describe('user endpoint contracts', () => {
  it('defines GET /users/:id params, public success, and canonical error', () => {
    expect(v.parse(getUserByIdContract.request, { id: 'user-1' })).toEqual({
      id: 'user-1',
    })
    expect(userIdParamsSchema).toBe(getUserByIdParamsSchema)
    expect(getUserByIdContract.success).toBe(publicUserSchema)
    expect(getUserByIdResponseSchema).toBe(publicUserSchema)
    expect(getUserByIdContract.error).toBe(apiErrorSchema)
  })

  it('defines GET /auth/me as bodyless with private success', () => {
    expect(getMeContract.request).toBeNull()
    expect(getMeContract.success).toBe(privateUserSchema)
    expect(getMeResponseSchema).toBe(privateUserSchema)
    expect(getMeContract.error).toBe(apiErrorSchema)
  })
})
