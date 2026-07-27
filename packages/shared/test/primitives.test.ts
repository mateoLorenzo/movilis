import { describe, expect, it } from 'vitest'
import * as v from 'valibot'

import { timestampWithOffsetPattern as exportedTimestampPattern } from '../src/index.js'
import { idSchema } from '../src/primitives/id.js'
import { cursorPageSchema } from '../src/primitives/pagination.js'
import {
  timestampSchema,
  timestampWithOffsetPattern,
} from '../src/primitives/timestamp.js'

describe('idSchema', () => {
  it('accepts application-generated non-empty text IDs', () => {
    expect(v.parse(idSchema, 'city_buenos-aires')).toBe('city_buenos-aires')
  })

  it.each(['', 42, null])('rejects invalid ID %j', (value) => {
    expect(v.safeParse(idSchema, value).success).toBe(false)
  })
})

describe('timestampSchema', () => {
  it.each([
    '2026-07-26T14:30:00Z',
    '2026-07-26T14:30:00.123Z',
    '2026-07-26T11:30:00-03:00',
    '2026-07-26T16:30:00+02:00',
  ])('accepts an ISO timestamp with an explicit UTC offset: %s', (value) => {
    expect(v.parse(timestampSchema, value)).toBe(value)
  })

  it.each(['0099-01-01T00:00:00Z', '0000-01-01T00:00:00Z'])(
    'accepts an early four-digit ISO year: %s',
    (value) => {
      expect(v.parse(timestampSchema, value)).toBe(value)
    },
  )

  it.each([
    '2026-07-26T14:30:00',
    '2026-07-26',
    '2026-02-30T14:30:00Z',
    'July 26, 2026 14:30 UTC',
    '',
  ])('rejects a timestamp without the required wire format: %s', (value) => {
    expect(v.safeParse(timestampSchema, value).success).toBe(false)
  })

  it('exports its wire-format pattern from the shared barrel', () => {
    expect(exportedTimestampPattern).toBe(timestampWithOffsetPattern)
  })
})

describe('cursorPageSchema', () => {
  const schema = cursorPageSchema(idSchema)

  it('accepts an opaque next cursor or null', () => {
    expect(
      v.parse(schema, { items: ['trip-1'], nextCursor: 'opaque:value' }),
    ).toEqual({ items: ['trip-1'], nextCursor: 'opaque:value' })
    expect(v.parse(schema, { items: [], nextCursor: null })).toEqual({
      items: [],
      nextCursor: null,
    })
  })

  it('rejects empty cursors and additional page fields', () => {
    expect(
      v.safeParse(schema, { items: [], nextCursor: '' }).success,
    ).toBe(false)
    expect(
      v.safeParse(schema, { items: [], nextCursor: null, total: 0 }).success,
    ).toBe(false)
  })
})
