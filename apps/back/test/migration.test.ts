import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('production auth security migration', () => {
  it('takes an exclusive otp_challenges lock before the destructive cutover', async () => {
    const sql = await readFile(
      new URL(
        '../../../packages/db/drizzle/0002_production_auth_security.sql',
        import.meta.url,
      ),
      'utf8',
    )
    const lock = sql.indexOf(
      'LOCK TABLE "otp_challenges" IN ACCESS EXCLUSIVE MODE',
    )
    const deletion = sql.indexOf('DELETE FROM "otp_challenges"')
    const alteration = sql.indexOf('ALTER TABLE "otp_challenges"')

    expect(lock).toBeGreaterThanOrEqual(0)
    expect(deletion).toBeGreaterThan(lock)
    expect(alteration).toBeGreaterThan(deletion)
  })
})
