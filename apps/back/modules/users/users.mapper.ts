import { users } from '@movilis/db'
import {
  privateUserSchema,
  publicUserSchema,
  type PrivateUser,
  type PublicUser,
} from '@movilis/shared'
import { parse } from 'valibot'

type UserRow = typeof users.$inferSelect

export function toPublicUser(user: UserRow): PublicUser {
  return parse(publicUserSchema, {
    id: user.id,
    fullName: user.fullName,
    profilePhotoUrl: user.profilePhotoUrl,
    ratingAverage: user.ratingAverage,
    ratingCount: user.ratingCount,
  })
}

export function toPrivateUser(user: UserRow): PrivateUser {
  return parse(privateUserSchema, {
    ...toPublicUser(user),
    phoneNumber: user.phoneNumber,
    cityId: user.cityId,
  })
}
