import { describe, expect, it } from 'vitest'

import { formatMoney, toCurrency } from './money'

describe('money helpers', () => {
  it('constructs currency.js from the decimal string without number conversion', () => {
    expect(toCurrency({ amount: '8500.10', currency: 'ARS' }).add('0.20').value)
      .toBe(8500.3)
  })

  it('centralizes ARS display formatting', () => {
    expect(formatMoney({ amount: '8500.00', currency: 'ARS' }))
      .toBe('$ 8.500,00')
  })

  it('rejects values currency.js cannot parse', () => {
    expect(() => toCurrency({ amount: 'not-money', currency: 'ARS' }))
      .toThrow()
  })
})
