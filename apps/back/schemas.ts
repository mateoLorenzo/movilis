import {
  apiErrorSchema,
  timestampWithOffsetPattern,
} from '@movilis/shared'
import { toJsonSchema } from '@valibot/to-json-schema'

type ConvertibleSchema = Parameters<typeof toJsonSchema>[0]
type JsonSchema = ReturnType<typeof toJsonSchema>

export function toFastifySchema(schema: ConvertibleSchema): JsonSchema {
  // Shared custom checks and finite guards have no JSON Schema action equivalent.
  return addTimestampFormats(
    toJsonSchema(schema, { ignoreActions: ['check', 'finite'] }),
  ) as JsonSchema
}

function addTimestampFormats(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(addTimestampFormats)
  if (!value || typeof value !== 'object') return value

  const schema = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, addTimestampFormats(child)]),
  )
  if (
    schema.type === 'string' &&
    schema.pattern === timestampWithOffsetPattern.source
  ) {
    schema.format = 'date-time'
  }
  return schema
}

const canonicalError = toFastifySchema(apiErrorSchema)

export const errorResponses = {
  400: canonicalError,
  401: canonicalError,
  403: canonicalError,
  404: canonicalError,
  409: canonicalError,
  429: canonicalError,
  500: canonicalError,
  503: canonicalError,
} as const
