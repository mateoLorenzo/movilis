import { beforeEach, describe, expect, it, vi } from 'vitest'

const secureStore = vi.hoisted(() => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}))

vi.mock('expo-secure-store', () => secureStore)

// The mocked module must be registered before the adapter is imported.
// eslint-disable-next-line import/first
import { REFRESH_TOKEN_KEY, secureTokenStore } from './token-store'

describe('secureTokenStore', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses only the versioned SecureStore key', async () => {
    secureStore.getItemAsync.mockResolvedValue('refresh-1')
    await expect(secureTokenStore.getRefreshToken()).resolves.toBe('refresh-1')
    await secureTokenStore.setRefreshToken('refresh-2')
    await secureTokenStore.deleteRefreshToken()

    expect(REFRESH_TOKEN_KEY).toBe('movilis.auth.refresh-token.v1')
    expect(secureStore.getItemAsync).toHaveBeenCalledWith(REFRESH_TOKEN_KEY)
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, 'refresh-2')
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(REFRESH_TOKEN_KEY)
  })
})
