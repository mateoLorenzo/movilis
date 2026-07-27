import * as v from 'valibot'

export const timestampWithOffsetPattern =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:(?:0\d|1[0-3]):[0-5]\d|14:00))$/

function hasValidCalendarDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export const timestampSchema = v.pipe(
  v.string(),
  v.regex(
    timestampWithOffsetPattern,
    'Timestamp must be ISO 8601 with an explicit UTC offset',
  ),
  v.check(
    (value) => hasValidCalendarDate(value) && !Number.isNaN(Date.parse(value)),
    'Timestamp must represent a valid date and time',
  ),
)

export type Timestamp = v.InferOutput<typeof timestampSchema>
