import type { ApiError, ApiErrorCode } from '@movilis/shared'
import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify'

const apiErrorStatusCodes = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  INVALID_OTP: 401,
  INVALID_ONBOARDING_TOKEN: 401,
  INVALID_REFRESH_TOKEN: 401,
  USER_ALREADY_EXISTS: 409,
  CITY_NOT_FOUND: 404,
  USER_NOT_FOUND: 404,
  INVALID_DEPARTURE_TIME: 400,
} satisfies Record<ApiErrorCode, number>

export class AppError extends Error {
  readonly statusCode: number

  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = apiErrorStatusCodes[code]
  }
}

export function registerErrorHandling(app: FastifyInstance) {
  app.setNotFoundHandler((request, reply) => {
    sendError(reply, request, 'NOT_FOUND', 'Resource not found')
  })

  app.setErrorHandler((error, request, reply) => {
    if (isValidationError(error)) {
      const fields = error.validation.map((issue) => ({
        path: validationPath(error.validationContext, issue),
        message: issue.message ?? 'Invalid value',
      }))
      return sendError(
        reply,
        request,
        'VALIDATION_ERROR',
        'Request validation failed',
        { fields },
      )
    }

    if (isRequestParsingError(error)) {
      return sendError(
        reply,
        request,
        'VALIDATION_ERROR',
        'Request validation failed',
      )
    }

    if (error instanceof AppError) {
      return sendError(reply, request, error.code, error.message)
    }

    request.log.error(
      { err: error, requestId: request.id },
      'Unhandled request error',
    )
    return sendError(
      reply,
      request,
      'INTERNAL_ERROR',
      'An unexpected error occurred',
    )
  })
}

function isRequestParsingError(error: unknown): error is FastifyError {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false
  }
  return new Set([
    'FST_ERR_CTP_BODY_TOO_LARGE',
    'FST_ERR_CTP_INVALID_JSON_BODY',
    'FST_ERR_CTP_INVALID_MEDIA_TYPE',
  ]).has(error.code as string)
}

function isValidationError(
  error: unknown,
): error is FastifyError & {
  validation: Array<{
    instancePath: string
    message?: string
    keyword: string
    params: { missingProperty?: string }
  }>
  validationContext?: string
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    'validation' in error &&
    Array.isArray(error.validation)
  )
}

function validationPath(
  context: string | undefined,
  issue: {
    instancePath: string
    keyword: string
    params: { missingProperty?: string }
  },
): string {
  const path = issue.instancePath.replaceAll('/', '.')
  const missing =
    issue.keyword === 'required' && issue.params.missingProperty
      ? `.${issue.params.missingProperty}`
      : ''
  return `${context ?? 'request'}${path}${missing}`
}

function sendError(
  reply: FastifyReply,
  request: FastifyRequest,
  code: ApiErrorCode,
  message: string,
  details?: ApiError['details'],
) {
  const body: ApiError = {
    code,
    message,
    requestId: request.id,
    ...(details ? { details } : {}),
  }
  return reply
    .code(apiErrorStatusCodes[code])
    .header('x-request-id', request.id)
    .send(body)
}
