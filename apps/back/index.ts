import 'dotenv/config'

import { loadConfig } from './config.js'
import { startServer } from './server.js'

try {
  await startServer(loadConfig(process.env))
} catch {
  console.error('Backend startup failed')
  process.exitCode = 1
}
