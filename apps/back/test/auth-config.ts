import type { AuthSecurityConfig } from '../config.js'

const defaultAuthConfig = {
  accessTokenTtlSeconds: 60,
  refreshTokenTtlSeconds: 120,
  otpTtlSeconds: 30,
  exposeDevOtpCode: true,
  otpCodeHmacSecret: 'test-otp-hmac-secret',
  rateLimitHmacSecret: 'test-rate-limit-hmac-secret',
  resendCooldownSeconds: 60,
  phoneWindowSeconds: 900,
  phoneWindowMaxRequests: 3,
  ipWindowSeconds: 900,
  ipWindowMaxRequests: 10,
  deviceWindowSeconds: 900,
  deviceWindowMaxRequests: 5,
  maxOtpAttempts: 3,
  otpRetentionSeconds: 86_400,
  sessionRetentionSeconds: 2_592_000,
  cleanupBatchSize: 500,
} satisfies AuthSecurityConfig

export function createTestAuthConfig(
  overrides: Partial<AuthSecurityConfig> = {},
): AuthSecurityConfig {
  return { ...defaultAuthConfig, ...overrides }
}
