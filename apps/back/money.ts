import type { Money } from '@movilis/shared'
import currency from 'currency.js'

const arsOptions = {
  precision: 2,
  errorOnInvalid: true,
} as const

export function moneyToDatabase(money: Money): number {
  return currency(money.amount, arsOptions).value
}

export function moneyFromDatabase(value: number): Money {
  const amount = currency(value, arsOptions).format({
    symbol: '',
    separator: '',
    decimal: '.',
    precision: 2,
  })
  return { amount, currency: 'ARS' }
}
