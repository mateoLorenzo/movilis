import type {
  ApiError as ApiErrorResponse,
  ApiErrorCode,
} from '@movilis/shared'

export class ApiError extends Error {
  readonly name = 'ApiError'
  readonly code: ApiErrorCode
  readonly requestId: string
  readonly details: ApiErrorResponse['details']

  constructor(
    readonly status: number,
    response: ApiErrorResponse,
  ) {
    super(response.message)
    this.code = response.code
    this.requestId = response.requestId
    this.details = response.details
  }
}

export class ResponseContractError extends Error {
  readonly name = 'ResponseContractError'

  constructor(
    readonly status: number,
    readonly path: string,
  ) {
    super(`Response for ${path} did not match its contract`)
  }
}

export class NetworkError extends Error {
  readonly name = 'NetworkError'

  constructor(readonly path: string) {
    super(`Network request to ${path} failed`)
  }
}

export class RequestTimeoutError extends Error {
  readonly name = 'RequestTimeoutError'

  constructor(readonly path: string, readonly timeoutMs: number) {
    super(`Request to ${path} timed out after ${timeoutMs} ms`)
  }
}

export class RequestCancelledError extends Error {
  readonly name = 'RequestCancelledError'

  constructor(readonly path: string) {
    super(`Request to ${path} was cancelled by its caller`)
  }
}

export class ConfigurationError extends Error {
  readonly name = 'ConfigurationError'
}

export class SessionRestoreError extends Error {
  readonly name = 'SessionRestoreError'

  constructor(cause: unknown) {
    super('The persisted session could not be restored', { cause })
  }
}

export class UnauthenticatedError extends Error {
  readonly name = 'UnauthenticatedError'

  constructor() {
    super('No local authentication credentials are available')
  }
}
