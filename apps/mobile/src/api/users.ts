import { publicUserSchema } from '@movilis/shared'
import type { Id, PublicUser } from '@movilis/shared'

import type { HttpTransport } from './client'

export interface UsersApi {
  getById(id: Id): Promise<PublicUser>
}

export function createUsersApi(transport: HttpTransport): UsersApi {
  return {
    getById: (id) =>
      transport.request({
        method: 'GET',
        path: `/users/${encodeURIComponent(id)}`,
        auth: false,
        responseSchema: publicUserSchema,
      }),
  }
}
