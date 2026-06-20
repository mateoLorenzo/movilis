import { createDb, type Db } from '@carpooling/db'
import type { FastifyInstance } from 'fastify'
import { Pool } from 'pg'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
  }
}

export async function registerDb(app: FastifyInstance) {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL is required')
  }

  const pool = new Pool({ connectionString })
  const db = createDb(pool)

  // Test the database connection before registering it with Fastify
  try {
    await pool.query('select 1')
  } catch (error) {
    await pool.end()
    throw error
  }

  app.decorate('db', db)
  app.addHook('onClose', async () => {
    await pool.end()
  })
}
