import type { ApiError, ApiErrorCode } from '@movilis/shared'
import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify'

export class AppError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function registerErrorHandling(app: FastifyInstance) {
  app.setNotFoundHandler((request, reply) => {
    sendError(reply, request, 404, 'NOT_FOUND', 'Resource not found')
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
        400,
        'VALIDATION_ERROR',
        'Request validation failed',
        { fields },
      )
    }

    if (error instanceof AppError) {
      return sendError(reply, request, error.statusCode, error.code, error.message)
    }

    request.log.error(
      { err: error, requestId: request.id },
      'Unhandled request error',
    )
    return sendError(
      reply,
      request,
      500,
      'INTERNAL_ERROR',
      'An unexpected error occurred',
    )
  })
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
  statusCode: number,
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
  return reply.code(statusCode).header('x-request-id', request.id).send(body)
}
