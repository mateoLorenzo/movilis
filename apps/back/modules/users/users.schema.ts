import {
  getUserByIdParamsSchema,
  getUserByIdResponseSchema,
} from '@movilis/shared'

import { toFastifySchema } from '../../schemas.js'

export const getUserByIdSchema = {
  params: toFastifySchema(getUserByIdParamsSchema),
  response: {
    200: toFastifySchema(getUserByIdResponseSchema),
  },
}
