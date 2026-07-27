import { moneySchema, type Money } from '@movilis/shared'
import currency from 'currency.js'
import * as v from 'valibot'

export type Currency = ReturnType<typeof currency>

const arsOptions = {
  precision: 2,
  errorOnInvalid: true,
} as const

const arsFormatOptions = {
  symbol: '$',
  separator: '.',
  decimal: ',',
  precision: 2,
  pattern: '! #',
} as const

export function toCurrency(money: Money): Currency {
  const parsedMoney = v.parse(moneySchema, money)

  switch (parsedMoney.currency) {
    case 'ARS':
      return currency(parsedMoney.amount, arsOptions)
  }
}

export function formatMoney(money: Money): string {
  return toCurrency(money).format(arsFormatOptions)
}
