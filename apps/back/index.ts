import 'dotenv/config'

import { loadConfig } from './config.js'
import { startServer } from './server.js'

try {
  await startServer(loadConfig(process.env))
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
