import {
  createTripResponseSchema,
  listMyTripsResponseSchema,
} from '@movilis/shared'
import type {
  CreateTripRequest,
  ListMyTripsResponse,
  OwnedTrip,
} from '@movilis/shared'

import type { SessionCoordinator } from './session'

export interface TripsApi {
  create(body: CreateTripRequest): Promise<OwnedTrip>
  listMine(): Promise<ListMyTripsResponse>
}

export function createTripsApi(session: SessionCoordinator): TripsApi {
  return {
    create: (body) =>
      session.request({
        method: 'POST',
        path: '/trips',
        body,
        responseSchema: createTripResponseSchema,
      }),
    listMine: () =>
      session.request({
        method: 'GET',
        path: '/trips/mine',
        responseSchema: listMyTripsResponseSchema,
      }),
  }
}
