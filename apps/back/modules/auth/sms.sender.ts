export interface SmsSender {
  sendOtp(input: {
    phoneNumber: string
    code: string
    expiresInSeconds: number
  }): Promise<{ providerMessageId: string }>
}
