import type { Db } from '@movilis/db'

export const usersService = {
  async getById(db: Db, id: string) {
    const user = await db.query.users.findFirst({
      where: (users, { and, eq, isNull }) =>
        and(eq(users.id, id), isNull(users.deletedAt)),
    })

    return user
  },
}
