import { describe, expect, it } from 'vitest'

import {
  ApiError,
  ConfigurationError,
  RequestCancelledError,
  RequestTimeoutError,
  ResponseContractError,
  SessionRestoreError,
  UnauthenticatedError,
} from './errors'

describe('mobile API failures', () => {
  it('exposes typed technical context without secrets', () => {
    const error = new ApiError(404, {
      code: 'USER_NOT_FOUND',
      message: 'User not found',
      requestId: 'req-1',
    })

    expect(error).toMatchObject({
      name: 'ApiError',
      status: 404,
      code: 'USER_NOT_FOUND',
      requestId: 'req-1',
      message: 'User not found',
    })
    expect(JSON.stringify(error)).not.toContain('Bearer')
  })

  it.each([
    new ResponseContractError(200, '/auth/me'),
    new RequestTimeoutError('/auth/me', 15_000),
    new RequestCancelledError('/auth/me'),
    new ConfigurationError('EXPO_PUBLIC_API_URL must be an absolute HTTP(S) URL'),
    new SessionRestoreError(new Error('offline')),
    new UnauthenticatedError(),
  ])('uses a stable class name for %s', (error) => {
    expect(error.name).toBe(error.constructor.name)
  })
})
