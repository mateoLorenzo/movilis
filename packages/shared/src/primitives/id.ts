import * as v from 'valibot'

export const idSchema = v.pipe(
  v.string(),
  v.minLength(1, 'ID must not be empty'),
)

export type Id = v.InferOutput<typeof idSchema>
