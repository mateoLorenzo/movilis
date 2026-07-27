import currency from 'currency.js'
import { describe, expect, it } from 'vitest'
import * as v from 'valibot'

import { moneySchema } from '../src/primitives/money.js'

describe('moneySchema', () => {
  it.each(['0.00', '1.05', '8500.00', '999999999.99'])(
    'accepts canonical ARS amount %s',
    (amount) => {
      expect(v.parse(moneySchema, { amount, currency: 'ARS' })).toEqual({
        amount,
        currency: 'ARS',
      })
    },
  )

  it.each([
    '-1.00',
    '+1.00',
    '1',
    '1.0',
    '1.000',
    '01.00',
    '1,000.00',
    '1e3',
    'NaN',
    '',
  ])('rejects non-canonical amount %s', (amount) => {
    expect(
      v.safeParse(moneySchema, { amount, currency: 'ARS' }).success,
    ).toBe(false)
  })

  it('rejects unsupported currencies and additional wire fields', () => {
    expect(
      v.safeParse(moneySchema, { amount: '10.00', currency: 'USD' }).success,
    ).toBe(false)
    expect(
      v.safeParse(moneySchema, {
        amount: '10.00',
        currency: 'ARS',
        precision: 2,
      }).success,
    ).toBe(false)
  })

  it('matches explicit currency.js precision at conversion boundaries', () => {
    const converted = currency(8500.1, {
      precision: 2,
      errorOnInvalid: true,
    }).value.toFixed(2)

    expect(converted).toBe('8500.10')
    expect(
      v.parse(moneySchema, { amount: converted, currency: 'ARS' }),
    ).toEqual({ amount: '8500.10', currency: 'ARS' })
  })
})
