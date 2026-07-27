import { afterEach, describe, expect, it, vi } from 'vitest'

import type { FetchImplementation } from './client'
import { jsonResponse, MemoryTokenStore } from './test-helpers'

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}))

// The native module mock must be registered before the composition root is imported.
// eslint-disable-next-line import/first
import { createApi } from './index'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('createApi', () => {
  it('shares one transport and session across domain modules', async () => {
    const fetch = vi.fn<FetchImplementation>(async (input) => {
      const path = new URL(input.toString()).pathname
      if (path === '/auth/refresh') {
        return jsonResponse({
          accessToken: 'access-2',
          refreshToken: 'refresh-2',
          user: {
            id: 'user-1',
            fullName: 'Ada Driver',
            profilePhotoUrl: null,
            ratingAverage: 5,
            ratingCount: 2,
            phoneNumber: '+541140392404',
            cityId: 'city-1',
          },
        })
      }
      return jsonResponse({ items: [], nextCursor: null })
    })
    const api = createApi({
      baseUrl: 'https://api.test',
      fetch,
      tokenStore: new MemoryTokenStore('refresh-1'),
    })

    await expect(api.trips.listMine()).resolves.toEqual({
      items: [],
      nextCursor: null,
    })
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

describe('getApi', () => {
  it.each([undefined, 'not-a-url'])(
    'defers invalid production configuration until requested (%s)',
    async (baseUrl) => {
      vi.stubEnv('EXPO_PUBLIC_API_URL', baseUrl)

      const [apiModule, { ConfigurationError }] = await Promise.all([
        import('./index'),
        import('./errors'),
      ])

      expect(apiModule).not.toHaveProperty('api')
      expect(() => apiModule.getApi()).toThrow(ConfigurationError)
    },
  )

  it('returns one lazily created production instance', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://api.test')
    const { getApi } = await import('./index')

    expect(getApi()).toBe(getApi())
  })
})
