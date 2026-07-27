import { createAuthApi, createLogoutRequest, createRefreshRequest } from './auth'
import { createHttpTransport } from './client'
import type { FetchImplementation } from './client'
import { createSessionCoordinator } from './session'
import { secureTokenStore } from './token-store'
import type { TokenStore } from './token-store'
import { createTripsApi } from './trips'
import { createUsersApi } from './users'

export interface CreateApiOptions {
  baseUrl: string | undefined
  fetch: FetchImplementation
  tokenStore: TokenStore
}

export function createApi({ baseUrl, fetch, tokenStore }: CreateApiOptions) {
  const transport = createHttpTransport({ baseUrl, fetch })
  const session = createSessionCoordinator({
    tokenStore,
    transport,
    refresh: createRefreshRequest(transport),
    revoke: createLogoutRequest(transport),
  })

  return {
    auth: createAuthApi({ transport, session }),
    trips: createTripsApi(session),
    users: createUsersApi(transport),
  }
}

export type Api = ReturnType<typeof createApi>

let productionApi: Api | undefined

export function getApi(): Api {
  productionApi ??= createApi({
    baseUrl: process.env.EXPO_PUBLIC_API_URL,
    fetch: globalThis.fetch.bind(globalThis),
    tokenStore: secureTokenStore,
  })
  return productionApi
}
