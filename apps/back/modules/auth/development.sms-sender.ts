import type { SmsSender } from './sms.sender.js'

export const developmentSmsSender: SmsSender = {
  async sendOtp() {
    return { providerMessageId: 'development' }
  },
}
