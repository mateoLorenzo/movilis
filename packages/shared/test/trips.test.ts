import { describe, expect, it } from 'vitest'
import * as v from 'valibot'

import {
  createTripContract,
  createTripBodySchema,
  createTripRequestSchema,
  createTripResponseSchema,
  listMyTripsContract,
  listMyTripsResponseSchema,
  ownedTripSchema,
  ownedTripPageSchema,
} from '../src/contracts/trips.js'
import type { OwnedTrip } from '../src/contracts/trips.js'
import { apiErrorSchema } from '../src/primitives/error.js'
import type { CursorPage } from '../src/primitives/pagination.js'

const createRequest = {
  originCityId: 'city-1',
  destinationCityId: 'city-2',
  departureAt: '2026-08-01T15:00:00Z',
  totalSeats: 3,
  pricePerSeat: { amount: '8500.00', currency: 'ARS' as const },
  contactPhoneNumber: '+541140392404',
  notes: 'One small bag per passenger',
}

const ownedTrip = {
  id: 'trip-1',
  driverId: 'user-1',
  originCityId: 'city-1',
  destinationCityId: 'city-2',
  departureAt: '2026-08-01T15:00:00Z',
  totalSeats: 3,
  availableSeats: 2,
  pricePerSeat: { amount: '8500.00', currency: 'ARS' as const },
  contactPhoneNumber: '+541140392404',
  notes: null,
  status: 'scheduled' as const,
  cancelledAt: null,
  completedAt: null,
  createdAt: '2026-07-26T14:30:00Z',
  updatedAt: '2026-07-26T14:30:00Z',
}

describe('createTripRequestSchema', () => {
  it('accepts all existing request fields with Money', () => {
    expect(v.parse(createTripRequestSchema, createRequest)).toEqual(createRequest)
    const { notes: _notes, ...withoutNotes } = createRequest
    expect(v.parse(createTripRequestSchema, withoutNotes)).toEqual(withoutNotes)
  })

  it.each([
    { ...createRequest, originCityId: '' },
    { ...createRequest, destinationCityId: '' },
    { ...createRequest, departureAt: '2026-08-01T15:00:00' },
    { ...createRequest, totalSeats: 0 },
    { ...createRequest, totalSeats: 9 },
    { ...createRequest, totalSeats: 1.5 },
    { ...createRequest, pricePerSeat: 8500 },
    { ...createRequest, pricePerSeat: { amount: '8500.0', currency: 'ARS' } },
    { ...createRequest, contactPhoneNumber: '1140392404' },
  ])('rejects invalid create request %#', (request) => {
    expect(v.safeParse(createTripRequestSchema, request).success).toBe(false)
  })
})

describe('ownedTripSchema', () => {
  it.each(['scheduled', 'ongoing', 'cancelled', 'completed'] as const)(
    'accepts status %s and the explicit owned DTO fields',
    (status) => {
      expect(v.parse(ownedTripSchema, { ...ownedTrip, status })).toEqual({
        ...ownedTrip,
        status,
      })
    },
  )

  it.each([
    { ...ownedTrip, totalSeats: -1 },
    { ...ownedTrip, availableSeats: -1 },
    { ...ownedTrip, availableSeats: 4 },
    { ...ownedTrip, status: 'draft' },
    { ...ownedTrip, cancelledAt: '2026-08-01T16:00:00' },
    { ...ownedTrip, pricePerSeat: 8500 },
    { ...ownedTrip, deletedAt: null },
  ])('rejects invalid or persistence-expanded owned trip %#', (trip) => {
    expect(v.safeParse(ownedTripSchema, trip).success).toBe(false)
  })
})

describe('trip endpoint contracts', () => {
  it('returns an OwnedTrip from POST /trips', () => {
    expect(createTripContract.request).toBe(createTripRequestSchema)
    expect(createTripBodySchema).toBe(createTripRequestSchema)
    expect(createTripContract.success).toBe(createTripResponseSchema)
    expect(createTripResponseSchema).toBe(ownedTripSchema)
    expect(createTripContract.error).toBe(apiErrorSchema)
  })

  it('returns the Phase 1 cursor page from GET /trips/mine', () => {
    const page: CursorPage<OwnedTrip> = {
      items: [ownedTrip],
      nextCursor: null,
    }

    expect(
      v.parse(listMyTripsResponseSchema, page),
    ).toEqual(page)
    expect(listMyTripsContract.request).toBeNull()
    expect(ownedTripPageSchema).toBe(listMyTripsResponseSchema)
    expect(listMyTripsContract.success).toBe(listMyTripsResponseSchema)
    expect(listMyTripsContract.error).toBe(apiErrorSchema)
  })
})
