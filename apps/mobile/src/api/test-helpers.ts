import { vi } from 'vitest'

import type { FetchImplementation } from './client'
import type { TokenStore } from './token-store'

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export function emptyResponse(status = 204): Response {
  return new Response(null, { status })
}

export function fetchMock(
  implementation: FetchImplementation,
): FetchImplementation {
  return vi.fn(implementation)
}

export class MemoryTokenStore implements TokenStore {
  constructor(public refreshToken: string | null = null) {}

  readonly getRefreshToken = vi.fn(async () => this.refreshToken)
  readonly setRefreshToken = vi.fn(async (token: string) => {
    this.refreshToken = token
  })
  readonly deleteRefreshToken = vi.fn(async () => {
    this.refreshToken = null
  })
}
