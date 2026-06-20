import type { FastifyPluginAsync } from 'fastify'

import {
  completeSignup,
  logout,
  me,
  refresh,
  requestOtp,
  verifyOtp,
} from './auth.controllers.js'
import {
  completeSignupSchema,
  logoutSchema,
  meSchema,
  refreshSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from './auth.schemas.js'

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/otp/request', { schema: requestOtpSchema }, requestOtp)
  app.post('/otp/verify', { schema: verifyOtpSchema }, verifyOtp)
  app.post('/signup/complete', { schema: completeSignupSchema }, completeSignup)
  app.post('/refresh', { schema: refreshSchema }, refresh)
  app.post('/logout', { schema: logoutSchema }, logout)
  app.get('/me', { schema: meSchema }, me)
}

export default authRoutes
