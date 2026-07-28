import twilio from 'twilio'

import type { SmsConfig } from '../../config.js'
import { AppError } from '../../errors.js'
import type { SmsSender } from './sms.sender.js'

type TwilioClient = {
  timeout?: number
  messages: {
    create(input: {
      to: string
      body: string
      from?: string
      messagingServiceSid?: string
    }): Promise<{ sid: string }>
  }
}

type TwilioClientFactory = (config: SmsConfig) => TwilioClient

export function createTwilioSmsSender(
  config: SmsConfig,
  client?: TwilioClient,
  createClient: TwilioClientFactory = createDefaultClient,
): SmsSender {
  let resolvedClient: TwilioClient
  try {
    resolvedClient = client ?? createClient(config)
    resolvedClient.timeout = config.timeoutMs
  } catch {
    throw deliveryError()
  }

  return {
    async sendOtp(input) {
      try {
        const message = await resolvedClient.messages.create({
          to: input.phoneNumber,
          body: `Tu código de Movilis es ${input.code}. Vence en ${formatTtl(input.expiresInSeconds)}.`,
          ...(config.fromNumber
            ? { from: config.fromNumber }
            : { messagingServiceSid: config.messagingServiceSid }),
        })
        return { providerMessageId: message.sid }
      } catch {
        throw deliveryError()
      }
    },
  }
}

function createDefaultClient(config: SmsConfig): TwilioClient {
  return twilio(config.accountSid, config.authToken, {
    timeout: config.timeoutMs,
  })
}

function deliveryError(): AppError {
  return new AppError('SMS_DELIVERY_FAILED', 'SMS delivery failed')
}

function formatTtl(expiresInSeconds: number): string {
  if (expiresInSeconds % 60 === 0) {
    const minutes = expiresInSeconds / 60
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
  }
  return `${expiresInSeconds} ${expiresInSeconds === 1 ? 'segundo' : 'segundos'}`
}
