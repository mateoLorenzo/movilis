import { apiErrorSchema } from '@movilis/shared'
import * as v from 'valibot'

import {
  ApiError,
  ConfigurationError,
  NetworkError,
  RequestCancelledError,
  RequestTimeoutError,
  ResponseContractError,
} from './errors'

const DEFAULT_TIMEOUT_MS = 15_000

export type FetchImplementation = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type RequestAuth = false | { accessToken: string }

interface CommonRequestOptions {
  method: Method
  path: string
  body?: unknown
  auth: RequestAuth
  signal?: AbortSignal
  timeoutMs?: number
}

export interface JsonRequestOptions<T> extends CommonRequestOptions {
  responseSchema: v.GenericSchema<unknown, T>
}

export interface EmptyRequestOptions extends CommonRequestOptions {
  responseSchema?: never
}

export interface HttpTransport {
  request<T>(options: JsonRequestOptions<T>): Promise<T>
  request(options: EmptyRequestOptions): Promise<void>
}

interface TransportDependencies {
  baseUrl: string | undefined
  fetch: FetchImplementation
  defaultTimeoutMs?: number
}

export function createHttpTransport({
  baseUrl,
  fetch,
  defaultTimeoutMs = DEFAULT_TIMEOUT_MS,
}: TransportDependencies): HttpTransport {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

  async function request(
    options: JsonRequestOptions<unknown> | EmptyRequestOptions,
  ): Promise<unknown> {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (options.body !== undefined) headers['Content-Type'] = 'application/json'
    if (options.auth) headers.Authorization = `Bearer ${options.auth.accessToken}`
    const url = createRequestUrl(options.path, normalizedBaseUrl)
    const requestBody =
      options.body === undefined ? undefined : JSON.stringify(options.body)

    const controller = new AbortController()
    let abortKind: 'caller' | 'timeout' | null = null
    const timeoutMs = options.timeoutMs ?? defaultTimeoutMs
    const cancelFromCaller = () => {
      if (abortKind === null) abortKind = 'caller'
      controller.abort()
    }

    if (options.signal?.aborted) cancelFromCaller()
    else options.signal?.addEventListener('abort', cancelFromCaller, { once: true })

    const timeout = setTimeout(() => {
      if (abortKind === null) abortKind = 'timeout'
      controller.abort()
    }, timeoutMs)

    try {
      let response: Response
      try {
        response = await fetch(url.toString(), {
          method: options.method,
          headers,
          body: requestBody,
          signal: controller.signal,
        })
      } catch {
        throwAbortFailure(abortKind, options.path, timeoutMs)
        throw new NetworkError(options.path)
      }

      if (!response.ok) {
        let body: unknown
        try {
          body = await response.json()
        } catch {
          throwAbortFailure(abortKind, options.path, timeoutMs)
          throw new ResponseContractError(response.status, options.path)
        }
        const parsed = v.safeParse(apiErrorSchema, body)
        if (!parsed.success) {
          throw new ResponseContractError(response.status, options.path)
        }
        throw new ApiError(response.status, parsed.output)
      }

      if (response.status === 204) return undefined
      if (!('responseSchema' in options) || options.responseSchema === undefined) {
        throw new ResponseContractError(response.status, options.path)
      }

      let body: unknown
      try {
        body = await response.json()
      } catch {
        throwAbortFailure(abortKind, options.path, timeoutMs)
        throw new ResponseContractError(response.status, options.path)
      }
      const parsed = v.safeParse(options.responseSchema, body)
      if (!parsed.success) {
        throw new ResponseContractError(response.status, options.path)
      }
      return parsed.output
    } finally {
      clearTimeout(timeout)
      options.signal?.removeEventListener('abort', cancelFromCaller)
    }
  }

  return { request } as HttpTransport
}

export function createExpoHttpTransport(): HttpTransport {
  return createHttpTransport({
    baseUrl: process.env.EXPO_PUBLIC_API_URL,
    fetch: globalThis.fetch.bind(globalThis),
  })
}

function normalizeBaseUrl(value: string | undefined): URL {
  if (!value) {
    throw new ConfigurationError(
      'EXPO_PUBLIC_API_URL must be an absolute HTTP(S) URL',
    )
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new ConfigurationError(
      'EXPO_PUBLIC_API_URL must be an absolute HTTP(S) URL',
    )
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ConfigurationError(
      'EXPO_PUBLIC_API_URL must be an absolute HTTP(S) URL',
    )
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/'
  return url
}

function createRequestUrl(path: string, baseUrl: URL): URL {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new TypeError('Request path must be API-relative')
  }
  const url = new URL(path.slice(1), baseUrl)
  if (url.origin !== baseUrl.origin) {
    throw new TypeError('Request path must be API-relative')
  }
  return url
}

function throwAbortFailure(
  abortKind: 'caller' | 'timeout' | null,
  path: string,
  timeoutMs: number,
): void {
  if (abortKind === 'caller') throw new RequestCancelledError(path)
  if (abortKind === 'timeout') throw new RequestTimeoutError(path, timeoutMs)
}
