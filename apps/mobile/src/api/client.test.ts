import * as v from 'valibot'
import { describe, expect, it, vi } from 'vitest'

import {
  ConfigurationError,
  NetworkError,
  RequestCancelledError,
  ResponseContractError,
} from './errors'
import { createHttpTransport } from './client'
import { emptyResponse, fetchMock, jsonResponse } from './test-helpers'

const resultSchema = v.object({ id: v.string() })

describe('HttpTransport', () => {
  it.each([undefined, '', 'api.test', 'ftp://api.test'])(
    'rejects invalid base URL %s',
    (baseUrl) => {
      expect(() => createHttpTransport({ baseUrl, fetch: vi.fn() })).toThrow(
        ConfigurationError,
      )
    },
  )

  it('serializes JSON and attaches only an explicitly supplied access token', async () => {
    const fetch = fetchMock(async () => jsonResponse({ id: 'trip-1' }, 201))
    const transport = createHttpTransport({
      baseUrl: 'https://api.test/v1',
      fetch,
    })

    await transport.request({
      method: 'POST',
      path: '/trips',
      body: { seats: 2 },
      auth: { accessToken: 'access-secret' },
      responseSchema: resultSchema,
    })

    expect(fetch).toHaveBeenCalledOnce()
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://api.test/v1/trips')
    expect(init).toMatchObject({
      method: 'POST',
      body: '{"seats":2}',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Bearer access-secret',
      },
    })
  })

  it('omits Authorization from public requests', async () => {
    const fetch = fetchMock(async () => jsonResponse({ id: 'user-1' }))
    const transport = createHttpTransport({
      baseUrl: 'https://api.test',
      fetch,
    })

    await transport.request({
      method: 'GET',
      path: '/users/user-1',
      auth: false,
      responseSchema: resultSchema,
    })

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(init?.headers).toEqual({ Accept: 'application/json' })
  })

  it('validates success payloads and rejects malformed success JSON', async () => {
    const malformed = createHttpTransport({
      baseUrl: 'https://api.test',
      fetch: fetchMock(async () => jsonResponse({ id: 1 })),
    })
    await expect(
      malformed.request({
        method: 'GET',
        path: '/users/1',
        auth: false,
        responseSchema: resultSchema,
      }),
    ).rejects.toBeInstanceOf(ResponseContractError)

    const invalidJson = createHttpTransport({
      baseUrl: 'https://api.test',
      fetch: fetchMock(async () => new Response('not-json', { status: 200 })),
    })
    await expect(
      invalidJson.request({
        method: 'GET',
        path: '/users/1',
        auth: false,
        responseSchema: resultSchema,
      }),
    ).rejects.toBeInstanceOf(ResponseContractError)
  })

  it('turns a canonical non-2xx response into ApiError without retrying', async () => {
    const fetch = fetchMock(async () =>
      jsonResponse(
        {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          requestId: 'req-9',
        },
        404,
      ),
    )
    const transport = createHttpTransport({
      baseUrl: 'https://api.test',
      fetch,
    })

    await expect(
      transport.request({
        method: 'GET',
        path: '/users/missing',
        auth: false,
        responseSchema: resultSchema,
      }),
    ).rejects.toMatchObject({
      status: 404,
      code: 'USER_NOT_FOUND',
      requestId: 'req-9',
    })
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('does not retry a canonical 5xx response', async () => {
    const fetch = fetchMock(async () =>
      jsonResponse(
        {
          code: 'INTERNAL_ERROR',
          message: 'Internal error',
          requestId: 'req-10',
        },
        500,
      ),
    )
    const transport = createHttpTransport({
      baseUrl: 'https://api.test',
      fetch,
    })
    await expect(
      transport.request({
        method: 'GET',
        path: '/trips/mine',
        auth: false,
        responseSchema: resultSchema,
      }),
    ).rejects.toMatchObject({ status: 500, code: 'INTERNAL_ERROR' })
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('returns void for 204 without parsing JSON', async () => {
    const response = emptyResponse()
    const json = vi.spyOn(response, 'json')
    const transport = createHttpTransport({
      baseUrl: 'https://api.test',
      fetch: fetchMock(async () => response),
    })

    await expect(
      transport.request({
        method: 'POST',
        path: '/auth/logout',
        auth: false,
      }),
    ).resolves.toBeUndefined()
    expect(json).not.toHaveBeenCalled()
  })

  it('does not retry a network failure', async () => {
    const fetch = fetchMock(async () => {
      throw new TypeError('offline')
    })
    const transport = createHttpTransport({
      baseUrl: 'https://api.test',
      fetch,
    })
    await expect(
      transport.request({
        method: 'GET',
        path: '/users/1',
        auth: false,
        responseSchema: resultSchema,
      }),
    ).rejects.toBeInstanceOf(NetworkError)
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('distinguishes caller cancellation from timeout', async () => {
    vi.useFakeTimers()
    const pendingFetch = fetchMock(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )
    const transport = createHttpTransport({
      baseUrl: 'https://api.test',
      fetch: pendingFetch,
    })

    const caller = new AbortController()
    const cancelled = transport.request({
      method: 'GET',
      path: '/users/1',
      auth: false,
      responseSchema: resultSchema,
      signal: caller.signal,
    })
    caller.abort()
    await expect(cancelled).rejects.toBeInstanceOf(RequestCancelledError)

    const timedOut = transport.request({
      method: 'GET',
      path: '/users/1',
      auth: false,
      responseSchema: resultSchema,
    })
    const timeoutExpectation = expect(timedOut).rejects.toMatchObject({
      name: 'RequestTimeoutError',
      timeoutMs: 15_000,
    })
    await vi.advanceTimersByTimeAsync(15_000)
    await timeoutExpectation
    vi.useRealTimers()
  })
})
