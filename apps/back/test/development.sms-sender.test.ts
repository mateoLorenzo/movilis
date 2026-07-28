import { describe, expect, it } from 'vitest'

import { developmentSmsSender } from '../modules/auth/development.sms-sender.js'

describe('developmentSmsSender', () => {
  it('accepts an OTP without contacting a provider', async () => {
    await expect(
      developmentSmsSender.sendOtp({
        phoneNumber: '+541140392404',
        code: '123456',
        expiresInSeconds: 600,
      }),
    ).resolves.toEqual({ providerMessageId: 'development' })
  })
})
