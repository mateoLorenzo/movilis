import type { AuthSession, PrivateUser } from '@movilis/shared'

import type { EmptyRequestOptions, HttpTransport, JsonRequestOptions } from './client'
import {
  ApiError,
  NetworkError,
  RequestTimeoutError,
  ResponseContractError,
  SessionRestoreError,
  UnauthenticatedError,
} from './errors'
import type { TokenStore } from './token-store'

export type AuthenticatedJsonRequestOptions<T> = Omit<
  JsonRequestOptions<T>,
  'auth'
>
export type AuthenticatedEmptyRequestOptions = Omit<EmptyRequestOptions, 'auth'>

export interface SessionDependencies {
  tokenStore: TokenStore
  transport: HttpTransport
  refresh(refreshToken: string): Promise<AuthSession>
  revoke(refreshToken: string): Promise<void>
}

export interface SessionCoordinator {
  getAccessToken(): string | null
  accept(session: AuthSession): Promise<PrivateUser>
  restore(): Promise<PrivateUser | null>
  request<T>(options: AuthenticatedJsonRequestOptions<T>): Promise<T>
  request(options: AuthenticatedEmptyRequestOptions): Promise<void>
  logout(): Promise<void>
}

export function createSessionCoordinator({
  tokenStore,
  transport,
  refresh,
  revoke,
}: SessionDependencies): SessionCoordinator {
  let accessToken: string | null = null
  let refreshFlight: Promise<AuthSession> | null = null
  let clearRefreshFailure = false
  let sessionEpoch = 0

  async function clearCredentials(): Promise<void> {
    accessToken = null
    await tokenStore.deleteRefreshToken()
  }

  async function accept(session: AuthSession): Promise<PrivateUser> {
    await tokenStore.setRefreshToken(session.refreshToken)
    accessToken = session.accessToken
    return session.user
  }

  async function refreshOnce(clearOnFailure = false): Promise<AuthSession> {
    if (clearOnFailure) clearRefreshFailure = true
    if (refreshFlight) return refreshFlight
    clearRefreshFailure = clearOnFailure
    const refreshEpoch = sessionEpoch
    const flight = (async () => {
      try {
        const refreshToken = await tokenStore.getRefreshToken()
        if (!refreshToken) throw new UnauthenticatedError()
        const next = await refresh(refreshToken)
        if (sessionEpoch !== refreshEpoch) throw new UnauthenticatedError()
        await accept(next)
        return next
      } catch (error) {
        if (clearRefreshFailure) await clearCredentials()
        throw error
      }
    })()
    refreshFlight = flight
    try {
      return await flight
    } finally {
      if (refreshFlight === flight) {
        refreshFlight = null
        clearRefreshFailure = false
      }
    }
  }

  async function restore(): Promise<PrivateUser | null> {
    let refreshToken: string | null
    try {
      refreshToken = await tokenStore.getRefreshToken()
    } catch (cause) {
      throw new SessionRestoreError(cause)
    }
    if (!refreshToken) {
      accessToken = null
      return null
    }

    try {
      return (await refreshOnce()).user
    } catch (error) {
      if (error instanceof NetworkError || error instanceof RequestTimeoutError) {
        throw new SessionRestoreError(error)
      }
      if (error instanceof ApiError || error instanceof ResponseContractError) {
        await clearCredentials()
        return null
      }
      throw new SessionRestoreError(error)
    }
  }

  async function requireAccessToken(): Promise<string> {
    if (accessToken) return accessToken
    return (await refreshOnce(true)).accessToken
  }

  async function recoverFrom401(rejectedToken: string): Promise<string> {
    if (accessToken && accessToken !== rejectedToken) return accessToken
    return (await refreshOnce(true)).accessToken
  }

  async function request(
    options:
      | AuthenticatedJsonRequestOptions<unknown>
      | AuthenticatedEmptyRequestOptions,
  ): Promise<unknown> {
    const firstToken = await requireAccessToken()
    try {
      return await transport.request({
        ...options,
        auth: { accessToken: firstToken },
      } as JsonRequestOptions<unknown>)
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error
    }

    const retryToken = await recoverFrom401(firstToken)
    try {
      return await transport.request({
        ...options,
        auth: { accessToken: retryToken },
      } as JsonRequestOptions<unknown>)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearCredentials()
      }
      throw error
    }
  }

  async function logout(): Promise<void> {
    sessionEpoch += 1
    let refreshToken: string | null = null
    try {
      refreshToken = await tokenStore.getRefreshToken()
      if (refreshToken) await revoke(refreshToken)
    } finally {
      await clearCredentials()
    }
  }

  return {
    getAccessToken: () => accessToken,
    accept,
    restore,
    request: request as SessionCoordinator['request'],
    logout,
  }
}
