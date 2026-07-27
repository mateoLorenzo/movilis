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
  let sessionEpoch = 0
  let credentialMutations = Promise.resolve()

  function mutateCredentials(operation: () => Promise<void>): Promise<void> {
    const result = credentialMutations.then(operation, operation)
    credentialMutations = result.catch(() => undefined)
    return result
  }

  function beginAuthoritativeTransition(): number {
    sessionEpoch += 1
    refreshFlight = null
    return sessionEpoch
  }

  async function clearCredentials(epoch: number): Promise<void> {
    if (sessionEpoch !== epoch) return
    accessToken = null
    await mutateCredentials(async () => {
      if (sessionEpoch === epoch) await tokenStore.deleteRefreshToken()
    })
  }

  async function persistRefreshToken(token: string, epoch: number): Promise<void> {
    await mutateCredentials(async () => {
      if (sessionEpoch !== epoch) throw new UnauthenticatedError()
      await tokenStore.setRefreshToken(token)
      if (sessionEpoch !== epoch) throw new UnauthenticatedError()
    })
  }

  async function accept(session: AuthSession): Promise<PrivateUser> {
    const acceptEpoch = beginAuthoritativeTransition()
    await persistRefreshToken(session.refreshToken, acceptEpoch)
    if (sessionEpoch !== acceptEpoch) throw new UnauthenticatedError()
    accessToken = session.accessToken
    return session.user
  }

  async function acceptRefresh(
    session: AuthSession,
    refreshEpoch: number,
  ): Promise<void> {
    await persistRefreshToken(session.refreshToken, refreshEpoch)
    accessToken = session.accessToken
  }

  async function refreshOnce(): Promise<AuthSession> {
    if (refreshFlight) return refreshFlight
    const refreshEpoch = sessionEpoch
    const flight = (async () => {
      try {
        const refreshToken = await tokenStore.getRefreshToken()
        if (sessionEpoch !== refreshEpoch) throw new UnauthenticatedError()
        if (!refreshToken) throw new UnauthenticatedError()
        const next = await refresh(refreshToken)
        if (sessionEpoch !== refreshEpoch) throw new UnauthenticatedError()
        await acceptRefresh(next, refreshEpoch)
        return next
      } catch (error) {
        if (error instanceof ApiError || error instanceof ResponseContractError) {
          await clearCredentials(refreshEpoch)
        }
        throw error
      }
    })()
    refreshFlight = flight
    try {
      return await flight
    } finally {
      if (refreshFlight === flight) {
        refreshFlight = null
      }
    }
  }

  async function restore(): Promise<PrivateUser | null> {
    const restoreEpoch = sessionEpoch
    let refreshToken: string | null
    try {
      refreshToken = await tokenStore.getRefreshToken()
    } catch (cause) {
      throw new SessionRestoreError(cause)
    }
    if (sessionEpoch !== restoreEpoch) {
      throw new SessionRestoreError(new UnauthenticatedError())
    }
    if (!refreshToken) {
      accessToken = null
      return null
    }

    try {
      return (await refreshOnce()).user
    } catch (error) {
      if (sessionEpoch !== restoreEpoch) {
        throw new SessionRestoreError(new UnauthenticatedError())
      }
      if (error instanceof NetworkError || error instanceof RequestTimeoutError) {
        throw new SessionRestoreError(error)
      }
      if (error instanceof ApiError || error instanceof ResponseContractError) {
        return null
      }
      throw new SessionRestoreError(error)
    }
  }

  async function requireAccessToken(): Promise<string> {
    if (accessToken) return accessToken
    return (await refreshOnce()).accessToken
  }

  async function recoverFrom401(rejectedToken: string): Promise<string> {
    if (accessToken && accessToken !== rejectedToken) return accessToken
    accessToken = null
    return (await refreshOnce()).accessToken
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
    const retryEpoch = sessionEpoch
    try {
      return await transport.request({
        ...options,
        auth: { accessToken: retryToken },
      } as JsonRequestOptions<unknown>)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearCredentials(retryEpoch)
      }
      throw error
    }
  }

  async function logout(): Promise<void> {
    const logoutEpoch = beginAuthoritativeTransition()
    accessToken = null
    let refreshToken: string | null = null
    try {
      refreshToken = await tokenStore.getRefreshToken()
      if (refreshToken) await revoke(refreshToken)
    } finally {
      await clearCredentials(logoutEpoch)
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
