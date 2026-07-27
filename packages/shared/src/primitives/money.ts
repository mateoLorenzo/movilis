import * as v from 'valibot'

const arsAmountPattern = /^(?:0|[1-9]\d*)\.\d{2}$/

export const moneySchema = v.strictObject({
  amount: v.pipe(
    v.string(),
    v.regex(
      arsAmountPattern,
      'ARS amount must be a canonical non-negative decimal with two fractional digits',
    ),
  ),
  currency: v.literal('ARS'),
})

export type Money = v.InferOutput<typeof moneySchema>
