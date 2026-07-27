import * as SecureStore from 'expo-secure-store'

export const REFRESH_TOKEN_KEY = 'movilis.auth.refresh-token.v1'

export interface TokenStore {
  getRefreshToken(): Promise<string | null>
  setRefreshToken(token: string): Promise<void>
  deleteRefreshToken(): Promise<void>
}

export const secureTokenStore: TokenStore = {
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  setRefreshToken: (token) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token),
  deleteRefreshToken: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
}
