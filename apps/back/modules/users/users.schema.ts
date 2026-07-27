import { getUserByIdParamsSchema, publicUserSchema } from '@movilis/shared'

import { errorResponses, toFastifySchema } from '../../schemas.js'

export const getUserByIdSchema = {
  params: toFastifySchema(getUserByIdParamsSchema),
  response: { 200: toFastifySchema(publicUserSchema), ...errorResponses },
}
