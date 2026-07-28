import { describe, expect, it, vi } from 'vitest'

import type { SmsConfig } from '../config.js'
import { createTwilioSmsSender } from '../modules/auth/twilio.sms-sender.js'

const baseConfig = {
  accountSid: 'AC123',
  authToken: 'auth-token',
  fromNumber: '+15555550100',
  messagingServiceSid: undefined,
  timeoutMs: 5_000,
} satisfies SmsConfig

function fakeClient(create = vi.fn()) {
  return {
    timeout: undefined as number | undefined,
    messages: { create },
  }
}

describe('createTwilioSmsSender', () => {
  it('translates client construction failures without leaking provider details', () => {
    const createClient = vi.fn(() => {
      throw new Error('Twilio constructor leaked auth-token')
    })

    let thrown: unknown
    try {
      createTwilioSmsSender(baseConfig, undefined, createClient)
    } catch (error) {
      thrown = error
    }

    expect(thrown).toMatchObject({
      code: 'SMS_DELIVERY_FAILED',
      message: 'SMS delivery failed',
    })
    expect(thrown).not.toHaveProperty('cause')
    expect(String(thrown)).not.toContain('Twilio')
    expect(String(thrown)).not.toContain('auth-token')
  })

  it('applies the configured request timeout to the client', () => {
    const client = fakeClient()

    createTwilioSmsSender(baseConfig, client)

    expect(client.timeout).toBe(5_000)
  })

  it('sends the OTP from the configured number and returns the provider ID', async () => {
    const create = vi.fn().mockResolvedValue({ sid: 'SM123' })
    const sender = createTwilioSmsSender(baseConfig, fakeClient(create))

    await expect(
      sender.sendOtp({
        phoneNumber: '+541140392404',
        code: '123456',
        expiresInSeconds: 600,
      }),
    ).resolves.toEqual({ providerMessageId: 'SM123' })

    expect(create).toHaveBeenCalledWith({
      to: '+541140392404',
      from: '+15555550100',
      body: expect.stringMatching(/123456.*10 minutos/i),
    })
  })

  it('sends from the configured messaging service', async () => {
    const create = vi.fn().mockResolvedValue({ sid: 'SM456' })
    const sender = createTwilioSmsSender(
      {
        ...baseConfig,
        fromNumber: undefined,
        messagingServiceSid: 'MG123',
      },
      fakeClient(create),
    )

    await sender.sendOtp({
      phoneNumber: '+541140392404',
      code: '654321',
      expiresInSeconds: 90,
    })

    expect(create).toHaveBeenCalledWith({
      to: '+541140392404',
      messagingServiceSid: 'MG123',
      body: expect.stringMatching(/654321.*90 segundos/i),
    })
  })

  it('translates provider failures without leaking provider details', async () => {
    const create = vi
      .fn()
      .mockRejectedValue(new Error('Twilio 21608: auth-token was rejected'))
    const sender = createTwilioSmsSender(baseConfig, fakeClient(create))

    await expect(
      sender.sendOtp({
        phoneNumber: '+541140392404',
        code: '123456',
        expiresInSeconds: 600,
      }),
    ).rejects.toMatchObject({
      code: 'SMS_DELIVERY_FAILED',
      message: 'SMS delivery failed',
    })

    await sender
      .sendOtp({
        phoneNumber: '+541140392404',
        code: '123456',
        expiresInSeconds: 600,
      })
      .catch((error: unknown) => {
        expect(String(error)).not.toContain('21608')
        expect(String(error)).not.toContain('auth-token')
      })
  })
})
