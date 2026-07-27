import type { ApiErrorCode, AuthSession, PrivateUser } from '@movilis/shared'
import * as v from 'valibot'
import { describe, expect, it, vi } from 'vitest'

import type { HttpTransport } from './client'
import {
  ApiError,
  NetworkError,
  ResponseContractError,
  SessionRestoreError,
  UnauthenticatedError,
} from './errors'
import { createSessionCoordinator } from './session'
import { MemoryTokenStore } from './test-helpers'

const user: PrivateUser = {
  id: 'user-1',
  fullName: 'Ada Driver',
  profilePhotoUrl: null,
  ratingAverage: 5,
  ratingCount: 2,
  phoneNumber: '+541140392404',
  cityId: 'city-1',
}
const rotated: AuthSession = {
  accessToken: 'access-2',
  refreshToken: 'refresh-2',
  user,
}
const responseSchema = v.object({ ok: v.boolean() })

function apiError(
  status: number,
  code: ApiErrorCode = 'UNAUTHENTICATED',
) {
  return new ApiError(status, { code, message: code, requestId: 'req-1' })
}

function setup(refreshToken: string | null = 'refresh-1') {
  const tokenStore = new MemoryTokenStore(refreshToken)
  const transport = { request: vi.fn<(options: any) => Promise<any>>() }
  const refresh = vi.fn(async () => rotated)
  const revoke = vi.fn(async () => undefined)
  const session = createSessionCoordinator({
    tokenStore,
    transport: transport as HttpTransport,
    refresh,
    revoke,
  })
  return { tokenStore, transport, refresh, revoke, session }
}

describe('SessionCoordinator restoration', () => {
  it('remains anonymous without making a request when no refresh token exists', async () => {
    const { session, refresh } = setup(null)
    await expect(session.restore()).resolves.toBeNull()
    expect(refresh).not.toHaveBeenCalled()
    expect(session.getAccessToken()).toBeNull()
  })

  it('rotates the persisted token and retains only access token in memory', async () => {
    const { session, refresh, tokenStore } = setup()
    await expect(session.restore()).resolves.toEqual(user)
    expect(refresh).toHaveBeenCalledWith('refresh-1')
    expect(tokenStore.setRefreshToken).toHaveBeenCalledWith('refresh-2')
    expect(session.getAccessToken()).toBe('access-2')
  })

  it('clears rejected credentials and returns anonymous', async () => {
    const { session, refresh, tokenStore } = setup()
    refresh.mockRejectedValue(apiError(401, 'INVALID_REFRESH_TOKEN'))
    await expect(session.restore()).resolves.toBeNull()
    expect(tokenStore.deleteRefreshToken).toHaveBeenCalledOnce()
    expect(session.getAccessToken()).toBeNull()
  })

  it('clears a refresh response that violates the success contract', async () => {
    const { session, refresh, tokenStore } = setup()
    refresh.mockRejectedValue(new ResponseContractError(200, '/auth/refresh'))
    await expect(session.restore()).resolves.toBeNull()
    expect(tokenStore.deleteRefreshToken).toHaveBeenCalledOnce()
    expect(session.getAccessToken()).toBeNull()
  })

  it('retains refresh token and reports recoverable restoration transport failure', async () => {
    const { session, refresh, tokenStore } = setup()
    refresh.mockRejectedValue(new NetworkError('/auth/refresh'))
    await expect(session.restore()).rejects.toBeInstanceOf(SessionRestoreError)
    expect(tokenStore.deleteRefreshToken).not.toHaveBeenCalled()
    expect(tokenStore.refreshToken).toBe('refresh-1')
  })
})

describe('SessionCoordinator authenticated requests', () => {
  it('retains credentials when restore and request share a recoverable refresh failure', async () => {
    const { session, refresh, tokenStore } = setup()
    let rejectRefresh!: (reason: unknown) => void
    refresh.mockImplementation(
      () => new Promise((_resolve, reject) => (rejectRefresh = reject)),
    )

    const restoring = session.restore()
    const requesting = session.request({
      method: 'GET',
      path: '/auth/me',
      responseSchema,
    })
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    rejectRefresh(new NetworkError('/auth/refresh'))

    const results = await Promise.allSettled([restoring, requesting])
    expect(results).toEqual([
      expect.objectContaining({
        status: 'rejected',
        reason: expect.any(SessionRestoreError),
      }),
      expect.objectContaining({
        status: 'rejected',
        reason: expect.any(NetworkError),
      }),
    ])
    expect(refresh).toHaveBeenCalledOnce()
    expect(tokenStore.deleteRefreshToken).not.toHaveBeenCalled()
    expect(tokenStore.refreshToken).toBe('refresh-1')
    expect(session.getAccessToken()).toBeNull()
  })

  it('clears credentials once when restore and request share a terminal refresh failure', async () => {
    const { session, refresh, tokenStore } = setup()
    let rejectRefresh!: (reason: unknown) => void
    refresh.mockImplementation(
      () => new Promise((_resolve, reject) => (rejectRefresh = reject)),
    )

    const restoring = session.restore()
    const requesting = session.request({
      method: 'GET',
      path: '/auth/me',
      responseSchema,
    })
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    rejectRefresh(apiError(401, 'INVALID_REFRESH_TOKEN'))

    const results = await Promise.allSettled([restoring, requesting])
    expect(results).toEqual([
      { status: 'fulfilled', value: null },
      expect.objectContaining({
        status: 'rejected',
        reason: expect.any(ApiError),
      }),
    ])
    expect(refresh).toHaveBeenCalledOnce()
    expect(tokenStore.deleteRefreshToken).toHaveBeenCalledOnce()
    expect(tokenStore.refreshToken).toBeNull()
    expect(session.getAccessToken()).toBeNull()
  })

  it('fails locally without calling the protected endpoint when no credentials exist', async () => {
    const { session, transport } = setup(null)
    await expect(
      session.request({
        method: 'GET',
        path: '/auth/me',
        responseSchema,
      }),
    ).rejects.toBeInstanceOf(UnauthenticatedError)
    expect(transport.request).not.toHaveBeenCalled()
  })

  it('restores first when access token is absent', async () => {
    const { session, transport, refresh } = setup()
    vi.mocked(transport.request).mockResolvedValue({ ok: true })
    await expect(
      session.request({
        method: 'GET',
        path: '/auth/me',
        responseSchema,
      }),
    ).resolves.toEqual({ ok: true })
    expect(refresh).toHaveBeenCalledOnce()
    expect(transport.request).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: { accessToken: 'access-2' },
      }),
    )
  })

  it('shares one restoration refresh across concurrent requests without access tokens', async () => {
    const { session, transport, refresh } = setup()
    let releaseRefresh!: (value: AuthSession) => void
    refresh.mockImplementation(
      () => new Promise((resolve) => (releaseRefresh = resolve)),
    )
    vi.mocked(transport.request).mockResolvedValue({ ok: true })

    const first = session.request({
      method: 'GET',
      path: '/trips/mine',
      responseSchema,
    })
    const second = session.request({
      method: 'GET',
      path: '/auth/me',
      responseSchema,
    })
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    releaseRefresh(rotated)

    await expect(Promise.all([first, second])).resolves.toEqual([
      { ok: true },
      { ok: true },
    ])
    expect(refresh).toHaveBeenCalledOnce()
    expect(transport.request).toHaveBeenCalledTimes(2)
  })

  it('refreshes after 401 and retries the original request exactly once', async () => {
    const { session, transport, refresh } = setup()
    await session.accept(rotated)
    vi.mocked(transport.request)
      .mockRejectedValueOnce(apiError(401))
      .mockResolvedValueOnce({ ok: true })
    await expect(
      session.request({
        method: 'GET',
        path: '/auth/me',
        responseSchema,
      }),
    ).resolves.toEqual({ ok: true })
    expect(refresh).toHaveBeenCalledOnce()
    expect(transport.request).toHaveBeenCalledTimes(2)
  })

  it('does not loop after the retried request returns 401', async () => {
    const { session, transport, refresh, tokenStore } = setup()
    await session.accept(rotated)
    vi.mocked(transport.request).mockRejectedValue(apiError(401))
    await expect(
      session.request({
        method: 'GET',
        path: '/auth/me',
        responseSchema,
      }),
    ).rejects.toBeInstanceOf(ApiError)
    expect(refresh).toHaveBeenCalledOnce()
    expect(transport.request).toHaveBeenCalledTimes(2)
    expect(tokenStore.deleteRefreshToken).toHaveBeenCalledOnce()
  })

  it('uses exactly one refresh for concurrent 401 responses', async () => {
    const { session, transport, refresh } = setup()
    await session.accept(rotated)
    let releaseRefresh!: (value: AuthSession) => void
    refresh.mockImplementation(
      () => new Promise((resolve) => (releaseRefresh = resolve)),
    )
    vi.mocked(transport.request)
      .mockRejectedValueOnce(apiError(401))
      .mockRejectedValueOnce(apiError(401))
      .mockResolvedValue({ ok: true })

    const first = session.request({
      method: 'GET',
      path: '/trips/mine',
      responseSchema,
    })
    const second = session.request({
      method: 'GET',
      path: '/auth/me',
      responseSchema,
    })
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    releaseRefresh({
      ...rotated,
      accessToken: 'access-3',
      refreshToken: 'refresh-3',
    })
    await expect(Promise.all([first, second])).resolves.toEqual([
      { ok: true },
      { ok: true },
    ])
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('keeps terminal concurrent 401 recovery single-flight through credential clearing', async () => {
    const { session, transport, refresh, tokenStore } = setup()
    await session.accept(rotated)
    let rejectRefresh!: (reason: unknown) => void
    refresh.mockImplementation(
      () => new Promise((_resolve, reject) => (rejectRefresh = reject)),
    )
    let releaseDelete!: () => void
    const deletePromise = new Promise<void>((resolve) => {
      releaseDelete = () => {
        tokenStore.refreshToken = null
        resolve()
      }
    })
    tokenStore.deleteRefreshToken.mockImplementation(() => deletePromise)

    let rejectLate!: (reason: unknown) => void
    transport.request.mockImplementation(async (options: any) => {
      if (options.path === '/trips/mine') throw apiError(401)
      return new Promise((_resolve, reject) => {
        rejectLate = reject
      })
    })

    const first = session.request({
      method: 'GET',
      path: '/trips/mine',
      responseSchema,
    })
    const late = session.request({
      method: 'GET',
      path: '/auth/me',
      responseSchema,
    })
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce())

    rejectRefresh(apiError(401, 'INVALID_REFRESH_TOKEN'))
    await vi.waitFor(() =>
      expect(tokenStore.deleteRefreshToken).toHaveBeenCalledOnce(),
    )
    rejectLate(apiError(401))
    releaseDelete()

    const results = await Promise.allSettled([first, late])
    expect(results).toEqual([
      expect.objectContaining({
        status: 'rejected',
        reason: expect.any(ApiError),
      }),
      expect.objectContaining({
        status: 'rejected',
        reason: expect.any(ApiError),
      }),
    ])
    expect(refresh).toHaveBeenCalledOnce()
    expect(tokenStore.deleteRefreshToken).toHaveBeenCalledOnce()
    expect(tokenStore.refreshToken).toBeNull()
    expect(session.getAccessToken()).toBeNull()
  })

  it('reuses a rotated access token when a stale 401 arrives late', async () => {
    const { session, transport, refresh } = setup()
    await session.accept(rotated)
    const nextSession = {
      ...rotated,
      accessToken: 'access-3',
      refreshToken: 'refresh-3',
    }
    refresh.mockResolvedValue(nextSession)

    let rejectLate!: (reason: unknown) => void
    vi.mocked(transport.request).mockImplementation(async (options: any) => {
      if (
        options.path === '/trips/mine' &&
        options.auth.accessToken === 'access-2'
      ) {
        throw apiError(401)
      }
      if (
        options.path === '/auth/me' &&
        options.auth.accessToken === 'access-2'
      ) {
        return new Promise((_resolve, reject) => {
          rejectLate = reject
        })
      }
      return { ok: true }
    })

    const first = session.request({
      method: 'GET',
      path: '/trips/mine',
      responseSchema,
    })
    const late = session.request({
      method: 'GET',
      path: '/auth/me',
      responseSchema,
    })
    await expect(first).resolves.toEqual({ ok: true })
    expect(session.getAccessToken()).toBe('access-3')

    rejectLate(apiError(401))
    await expect(late).resolves.toEqual({ ok: true })
    expect(refresh).toHaveBeenCalledOnce()
    expect(transport.request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        path: '/auth/me',
        auth: { accessToken: 'access-3' },
      }),
    )
  })

  it('retains credentials when refresh recovery has a recoverable failure', async () => {
    const { session, transport, refresh, tokenStore } = setup()
    await session.accept(rotated)
    vi.mocked(transport.request).mockRejectedValueOnce(apiError(401))
    refresh.mockRejectedValueOnce(new NetworkError('/auth/refresh'))
    await expect(
      session.request({
        method: 'GET',
        path: '/auth/me',
        responseSchema,
      }),
    ).rejects.toBeInstanceOf(NetworkError)
    expect(tokenStore.deleteRefreshToken).not.toHaveBeenCalled()
    expect(tokenStore.refreshToken).toBe('refresh-2')
    expect(session.getAccessToken()).toBeNull()
  })

  it('does not let a stale retry 401 clear a later login', async () => {
    const { session, transport, refresh, tokenStore } = setup()
    await session.accept(rotated)
    refresh.mockResolvedValue({
      ...rotated,
      accessToken: 'access-3',
      refreshToken: 'refresh-3',
    })
    let rejectRetry!: (reason: unknown) => void
    transport.request.mockImplementation(async (options: any) => {
      if (options.auth.accessToken === 'access-2') throw apiError(401)
      if (options.auth.accessToken === 'access-3') {
        return new Promise((_resolve, reject) => {
          rejectRetry = reject
        })
      }
      return { ok: true }
    })

    const staleRequest = session.request({
      method: 'GET',
      path: '/auth/me',
      responseSchema,
    })
    await vi.waitFor(() => expect(rejectRetry).toBeTypeOf('function'))
    await session.accept({
      ...rotated,
      accessToken: 'access-login',
      refreshToken: 'refresh-login',
    })
    rejectRetry(apiError(401))

    await expect(staleRequest).rejects.toBeInstanceOf(ApiError)
    expect(tokenStore.refreshToken).toBe('refresh-login')
    expect(session.getAccessToken()).toBe('access-login')
    await expect(
      session.request({
        method: 'GET',
        path: '/auth/me',
        responseSchema,
      }),
    ).resolves.toEqual({ ok: true })
    expect(transport.request).toHaveBeenLastCalledWith(
      expect.objectContaining({ auth: { accessToken: 'access-login' } }),
    )
  })

  it('does not let a stale retry 401 clear a newer same-epoch rotation', async () => {
    const { session, transport, refresh, tokenStore } = setup()
    await session.accept(rotated)
    refresh
      .mockResolvedValueOnce({
        ...rotated,
        accessToken: 'access-3',
        refreshToken: 'refresh-3',
      })
      .mockResolvedValueOnce({
        ...rotated,
        accessToken: 'access-4',
        refreshToken: 'refresh-4',
      })
    let rejectStaleRetry!: (reason: unknown) => void
    transport.request.mockImplementation(async (options: any) => {
      const token = options.auth.accessToken
      if (options.path === '/trips/mine' && token === 'access-2') {
        throw apiError(401)
      }
      if (options.path === '/trips/mine' && token === 'access-3') {
        return new Promise((_resolve, reject) => {
          rejectStaleRetry = reject
        })
      }
      if (options.path === '/auth/me' && token === 'access-3') {
        throw apiError(401)
      }
      return { ok: true }
    })

    const staleRequest = session.request({
      method: 'GET',
      path: '/trips/mine',
      responseSchema,
    })
    await vi.waitFor(() => expect(rejectStaleRetry).toBeTypeOf('function'))
    await expect(
      session.request({
        method: 'GET',
        path: '/auth/me',
        responseSchema,
      }),
    ).resolves.toEqual({ ok: true })
    expect(session.getAccessToken()).toBe('access-4')
    expect(tokenStore.refreshToken).toBe('refresh-4')

    rejectStaleRetry(apiError(401))
    await expect(staleRequest).rejects.toBeInstanceOf(ApiError)
    expect(session.getAccessToken()).toBe('access-4')
    expect(tokenStore.refreshToken).toBe('refresh-4')
    await expect(
      session.request({
        method: 'GET',
        path: '/auth/me',
        responseSchema,
      }),
    ).resolves.toEqual({ ok: true })
    expect(transport.request).toHaveBeenLastCalledWith(
      expect.objectContaining({ auth: { accessToken: 'access-4' } }),
    )
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('retains T4 when request B persists it before a delayed T3 retry fails', async () => {
    const { session, transport, refresh, tokenStore } = setup()
    await session.accept(rotated)
    refresh
      .mockResolvedValueOnce({
        ...rotated,
        accessToken: 'access-3',
        refreshToken: 'refresh-3',
      })
      .mockResolvedValueOnce({
        ...rotated,
        accessToken: 'access-4',
        refreshToken: 'refresh-4',
      })
    let releaseT4Persistence!: () => void
    tokenStore.setRefreshToken.mockImplementation(
      (token) =>
        new Promise((resolve) => {
          if (token !== 'refresh-4') {
            tokenStore.refreshToken = token
            resolve()
            return
          }
          releaseT4Persistence = () => {
            tokenStore.refreshToken = token
            resolve()
          }
        }),
    )
    let rejectT3Retry!: (reason: unknown) => void
    transport.request.mockImplementation(async (options: any) => {
      const token = options.auth.accessToken
      if (options.path === '/trips/mine' && token === 'access-2') {
        throw apiError(401)
      }
      if (options.path === '/trips/mine' && token === 'access-3') {
        return new Promise((_resolve, reject) => {
          rejectT3Retry = reject
        })
      }
      if (options.path === '/auth/me' && token === 'access-3') {
        throw apiError(401)
      }
      return { ok: true }
    })

    const requestA = session.request({
      method: 'GET',
      path: '/trips/mine',
      responseSchema,
    })
    await vi.waitFor(() => expect(rejectT3Retry).toBeTypeOf('function'))
    const requestB = session.request({
      method: 'GET',
      path: '/auth/me',
      responseSchema,
    })
    await vi.waitFor(() =>
      expect(tokenStore.setRefreshToken).toHaveBeenCalledWith('refresh-4'),
    )

    rejectT3Retry(apiError(401))
    await expect(requestA).rejects.toBeInstanceOf(ApiError)
    releaseT4Persistence()
    await expect(requestB).resolves.toEqual({ ok: true })
    expect(session.getAccessToken()).toBe('access-4')
    expect(tokenStore.refreshToken).toBe('refresh-4')
    await expect(
      session.request({
        method: 'GET',
        path: '/auth/me',
        responseSchema,
      }),
    ).resolves.toEqual({ ok: true })
    expect(transport.request).toHaveBeenLastCalledWith(
      expect.objectContaining({ auth: { accessToken: 'access-4' } }),
    )
  })

  it('does not queue stale T3 deletion during T4 persistence', async () => {
    const { session, transport, refresh, tokenStore } = setup()
    await session.accept(rotated)
    refresh
      .mockResolvedValueOnce({
        ...rotated,
        accessToken: 'access-3',
        refreshToken: 'refresh-3',
      })
      .mockResolvedValueOnce({
        ...rotated,
        accessToken: 'access-4',
        refreshToken: 'refresh-4',
      })
    let releaseT4Persistence!: () => void
    tokenStore.setRefreshToken.mockImplementation(
      (token) =>
        new Promise((resolve) => {
          if (token !== 'refresh-4') {
            tokenStore.refreshToken = token
            resolve()
            return
          }
          releaseT4Persistence = () => {
            tokenStore.refreshToken = token
            resolve()
          }
        }),
    )
    let rejectT3Retry!: (reason: unknown) => void
    transport.request.mockImplementation(async (options: any) => {
      if (options.auth.accessToken === 'access-2') throw apiError(401)
      if (options.auth.accessToken === 'access-3') {
        return new Promise((_resolve, reject) => {
          rejectT3Retry = reject
        })
      }
      return { ok: true }
    })

    const requestA = session.request({
      method: 'GET',
      path: '/trips/mine',
      responseSchema,
    })
    await vi.waitFor(() => expect(rejectT3Retry).toBeTypeOf('function'))
    const restoringT4 = session.restore()
    await vi.waitFor(() =>
      expect(tokenStore.setRefreshToken).toHaveBeenCalledWith('refresh-4'),
    )

    rejectT3Retry(apiError(401))
    releaseT4Persistence()
    await expect(requestA).rejects.toBeInstanceOf(ApiError)
    await expect(restoringT4).resolves.toEqual(user)
    expect(session.getAccessToken()).toBe('access-4')
    expect(tokenStore.refreshToken).toBe('refresh-4')
  })
})

describe('SessionCoordinator logout', () => {
  it('keeps a login accepted after logout begins', async () => {
    const { session, revoke, tokenStore } = setup()
    await session.accept(rotated)
    let finishRevoke!: () => void
    revoke.mockImplementation(
      () =>
        new Promise<undefined>((resolve) => {
          finishRevoke = () => resolve(undefined)
        }),
    )

    const logout = session.logout()
    await vi.waitFor(() => expect(revoke).toHaveBeenCalledWith('refresh-2'))
    const login = {
      ...rotated,
      accessToken: 'access-login',
      refreshToken: 'refresh-login',
    }
    await session.accept(login)
    finishRevoke()
    await logout

    expect(tokenStore.refreshToken).toBe('refresh-login')
    expect(session.getAccessToken()).toBe('access-login')
  })

  it('rejects a superseded terminal restore without clearing the later login', async () => {
    const { session, refresh, tokenStore } = setup()
    let rejectRefresh!: (reason: unknown) => void
    refresh.mockImplementation(
      () => new Promise((_resolve, reject) => (rejectRefresh = reject)),
    )

    const restoring = session.restore()
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    await session.accept({
      ...rotated,
      accessToken: 'access-login',
      refreshToken: 'refresh-login',
    })
    rejectRefresh(apiError(401, 'INVALID_REFRESH_TOKEN'))

    await expect(restoring).rejects.toMatchObject({
      name: 'SessionRestoreError',
      message: 'The persisted session could not be restored',
      cause: expect.any(UnauthenticatedError),
    })
    expect(tokenStore.refreshToken).toBe('refresh-login')
    expect(session.getAccessToken()).toBe('access-login')
  })

  it('does not let a stale refresh result replace a later login', async () => {
    const { session, refresh, tokenStore } = setup()
    let finishRefresh!: (value: AuthSession) => void
    refresh.mockImplementation(
      () => new Promise((resolve) => (finishRefresh = resolve)),
    )

    const restoring = session.restore()
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    await session.accept({
      ...rotated,
      accessToken: 'access-login',
      refreshToken: 'refresh-login',
    })
    finishRefresh({
      ...rotated,
      accessToken: 'access-stale',
      refreshToken: 'refresh-stale',
    })

    await expect(restoring).rejects.toBeInstanceOf(SessionRestoreError)
    expect(tokenStore.refreshToken).toBe('refresh-login')
    expect(session.getAccessToken()).toBe('access-login')
  })

  it('removes a refresh token persisted after logout invalidates its epoch', async () => {
    const { session, transport, refresh, tokenStore } = setup()
    await session.accept(rotated)
    tokenStore.setRefreshToken.mockClear()
    let releasePersistence!: () => void
    tokenStore.setRefreshToken.mockImplementation(
      (token) =>
        new Promise((resolve) => {
          releasePersistence = () => {
            tokenStore.refreshToken = token
            resolve()
          }
        }),
    )
    refresh.mockResolvedValue({
      ...rotated,
      accessToken: 'access-3',
      refreshToken: 'refresh-3',
    })
    transport.request.mockRejectedValueOnce(apiError(401))

    const request = session.request({
      method: 'GET',
      path: '/auth/me',
      responseSchema,
    })
    await vi.waitFor(() =>
      expect(tokenStore.setRefreshToken).toHaveBeenCalledWith('refresh-3'),
    )

    const logout = session.logout()
    releasePersistence()
    await logout

    await expect(request).rejects.toBeInstanceOf(UnauthenticatedError)
    expect(tokenStore.refreshToken).toBeNull()
    expect(session.getAccessToken()).toBeNull()
  })

  it('prevents an in-flight refresh from restoring credentials after logout', async () => {
    const { session, transport, refresh, tokenStore } = setup()
    await session.accept(rotated)
    tokenStore.setRefreshToken.mockClear()
    let releaseRefresh!: (value: AuthSession) => void
    refresh.mockImplementation(
      () => new Promise((resolve) => (releaseRefresh = resolve)),
    )
    transport.request.mockRejectedValueOnce(apiError(401))

    const request = session.request({
      method: 'GET',
      path: '/auth/me',
      responseSchema,
    })
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce())

    await session.logout()
    expect(session.getAccessToken()).toBeNull()
    expect(tokenStore.refreshToken).toBeNull()

    releaseRefresh({
      ...rotated,
      accessToken: 'access-3',
      refreshToken: 'refresh-3',
    })
    await expect(request).rejects.toBeInstanceOf(UnauthenticatedError)
    expect(tokenStore.setRefreshToken).not.toHaveBeenCalled()
    expect(tokenStore.refreshToken).toBeNull()
    expect(session.getAccessToken()).toBeNull()
  })

  it('clears both local tokens even when revocation fails', async () => {
    const { session, revoke, tokenStore } = setup()
    await session.accept(rotated)
    revoke.mockRejectedValue(new NetworkError('/auth/logout'))
    await expect(session.logout()).rejects.toBeInstanceOf(NetworkError)
    expect(revoke).toHaveBeenCalledWith('refresh-2')
    expect(tokenStore.deleteRefreshToken).toHaveBeenCalledOnce()
    expect(session.getAccessToken()).toBeNull()
  })
})
