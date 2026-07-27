import {
  getUserByIdParamsSchema,
  getUserByIdResponseSchema,
} from '@movilis/shared'

import { errorResponses, toFastifySchema } from '../../schemas.js'

export const getUserByIdSchema = {
  params: toFastifySchema(getUserByIdParamsSchema),
  response: {
    ...errorResponses,
    200: toFastifySchema(getUserByIdResponseSchema),
  },
}
