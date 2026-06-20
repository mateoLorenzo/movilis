import { users } from '@carpooling/db'
import type { ConversionConfig } from '@valibot/to-json-schema'
import { toJsonSchema } from '@valibot/to-json-schema'
import type { Table } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-valibot'
import * as v from 'valibot'

const userSchema = createSelectSchema(users as unknown as Table)
const userIdParamsSchema = v.pick(userSchema, ['id'])

const jsonSchemaConfig = {
  overrideSchema: ({ valibotSchema }) => {
    if (valibotSchema.type === 'date') {
      return { type: 'string', format: 'date-time' }
    }
  },
} satisfies ConversionConfig

export const getUserByIdSchema = {
  params: toJsonSchema(userIdParamsSchema, jsonSchemaConfig),
  response: {
    200: toJsonSchema(userSchema, jsonSchemaConfig),
  },
}
