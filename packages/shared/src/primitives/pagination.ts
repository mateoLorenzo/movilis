import * as v from 'valibot'

export const cursorSchema = v.pipe(
  v.string(),
  v.minLength(1, 'Cursor must not be empty'),
)

export function cursorPageSchema<const TItem extends v.GenericSchema>(
  itemSchema: TItem,
) {
  return v.strictObject({
    items: v.array(itemSchema),
    nextCursor: v.nullable(cursorSchema),
  })
}

export type CursorPage<T> = v.InferOutput<
  ReturnType<typeof cursorPageSchema<v.GenericSchema<unknown, T>>>
>
