import { createDb, type Db } from '@movilis/db'
import { Pool } from 'pg'

export type DatabaseHandle = {
  db: Db
  close: () => Promise<void>
}

export async function createDatabase(
  connectionString: string,
): Promise<DatabaseHandle> {
  const pool = new Pool({ connectionString })
  try {
    await pool.query('select 1')
  } catch (error) {
    await pool.end()
    throw error
  }

  return {
    db: createDb(pool),
    close: () => pool.end(),
  }
}
