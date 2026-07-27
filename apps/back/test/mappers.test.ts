import { describe, expect, it } from 'vitest'

import { moneyFromDatabase, moneyToDatabase } from '../money.js'
import { toOwnedTrip } from '../modules/trips/trips.mapper.js'
import {
  toPrivateUser,
  toPublicUser,
} from '../modules/users/users.mapper.js'

const userRow = {
  id: 'user-1',
  phoneNumber: '+541140392404',
  fullName: 'Ada Lovelace',
  profilePhotoUrl: null,
  cityId: 'city-1',
  ratingAverage: 4.5,
  ratingCount: 8,
  createdAt: new Date('2026-07-26T10:00:00-03:00'),
  updatedAt: new Date('2026-07-26T11:00:00-03:00'),
  deletedAt: null,
}

describe('money mapping', () => {
  it('converts ARS wire money to the existing real-column value', () => {
    expect(
      moneyToDatabase({ amount: '8500.00', currency: 'ARS' }),
    ).toBe(8500)
  })

  it('converts a real-column value to canonical ARS wire money', () => {
    expect(moneyFromDatabase(8500.5)).toEqual({
      amount: '8500.50',
      currency: 'ARS',
    })
  })
})

describe('user mapping', () => {
  it('returns only public fields', () => {
    expect(toPublicUser(userRow)).toEqual({
      id: 'user-1',
      fullName: 'Ada Lovelace',
      profilePhotoUrl: null,
      ratingAverage: 4.5,
      ratingCount: 8,
    })
  })

  it('returns private fields without persistence timestamps', () => {
    expect(toPrivateUser(userRow)).toEqual({
      id: 'user-1',
      fullName: 'Ada Lovelace',
      profilePhotoUrl: null,
      ratingAverage: 4.5,
      ratingCount: 8,
      phoneNumber: '+541140392404',
      cityId: 'city-1',
    })
  })

  it('rejects a non-finite rating from persistence', () => {
    expect(() =>
      toPrivateUser({ ...userRow, ratingAverage: Number.NaN }),
    ).toThrow()
  })
})

describe('trip mapping', () => {
  it('normalizes dates, nulls, and money', () => {
    expect(
      toOwnedTrip({
        id: 'trip-1',
        driverId: 'user-1',
        originCityId: 'city-1',
        destinationCityId: 'city-2',
        departureAt: new Date('2026-08-01T10:00:00-03:00'),
        totalSeats: 4,
        availableSeats: 4,
        pricePerSeat: 8500.5,
        contactPhoneNumber: '+541140392404',
        notes: null,
        status: 'scheduled',
        cancelledAt: null,
        completedAt: null,
        createdAt: new Date('2026-07-26T10:00:00-03:00'),
        updatedAt: new Date('2026-07-26T11:00:00-03:00'),
      }),
    ).toEqual({
      id: 'trip-1',
      driverId: 'user-1',
      originCityId: 'city-1',
      destinationCityId: 'city-2',
      departureAt: '2026-08-01T13:00:00.000Z',
      totalSeats: 4,
      availableSeats: 4,
      pricePerSeat: { amount: '8500.50', currency: 'ARS' },
      contactPhoneNumber: '+541140392404',
      notes: null,
      status: 'scheduled',
      cancelledAt: null,
      completedAt: null,
      createdAt: '2026-07-26T13:00:00.000Z',
      updatedAt: '2026-07-26T14:00:00.000Z',
    })
  })

  it('rejects persistence rows that violate the shared trip contract', () => {
    expect(() =>
      toOwnedTrip({
        id: 'trip-1',
        driverId: 'user-1',
        originCityId: 'city-1',
        destinationCityId: 'city-2',
        departureAt: new Date('2026-08-01T10:00:00-03:00'),
        totalSeats: 2,
        availableSeats: 3,
        pricePerSeat: 8500,
        contactPhoneNumber: '+541140392404',
        notes: null,
        status: 'scheduled',
        cancelledAt: null,
        completedAt: null,
        createdAt: new Date('2026-07-26T10:00:00-03:00'),
        updatedAt: new Date('2026-07-26T11:00:00-03:00'),
      }),
    ).toThrow()
  })
})
