import { users } from '@movilis/db'
import type { PrivateUser, PublicUser } from '@movilis/shared'

type UserRow = typeof users.$inferSelect

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    profilePhotoUrl: user.profilePhotoUrl,
    ratingAverage: user.ratingAverage,
    ratingCount: user.ratingCount,
  }
}

export function toPrivateUser(user: UserRow): PrivateUser {
  return {
    ...toPublicUser(user),
    phoneNumber: user.phoneNumber,
    cityId: user.cityId,
  }
}
