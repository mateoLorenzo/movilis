import { afterEach, describe, expect, it, vi } from 'vitest'

const unsafeDatabaseError =
  'TEST_DATABASE_URL must be a PostgreSQL URL for a database ending in "_test"'

describe('integration database safety', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it.each(['movilis_test', 'movilis%5Ftest'])(
    'accepts decoded test database name %s',
    async (databaseName) => {
      vi.stubEnv(
        'TEST_DATABASE_URL',
        `postgresql://user:password@localhost:5432/${databaseName}`,
      )

      const { testPool } = await import('./database.js')

      await testPool.end()
    },
  )

  it.each(['movilis', 'movilis_testing', 'test'])(
    'rejects production-like database name %s',
    async (databaseName) => {
      vi.stubEnv(
        'TEST_DATABASE_URL',
        `postgresql://user:super-secret@localhost:5432/${databaseName}`,
      )

      await expect(import('./database.js')).rejects.toThrow(unsafeDatabaseError)
    },
  )

  it.each([
    'not-a-url',
    'postgresql://user:super-secret@localhost',
    'postgresql://user:super-secret@localhost/',
    'postgresql://user:super-secret@localhost/movilis%ZZ_test',
    'https://localhost/movilis_test',
  ])(
    'rejects malformed or unnamed PostgreSQL URL %#',
    async (connectionString) => {
      vi.stubEnv('TEST_DATABASE_URL', connectionString)

      let error: unknown
      try {
        await import('./database.js')
      } catch (caught) {
        error = caught
      }

      expect(error).toEqual(new Error(unsafeDatabaseError))
      expect(String(error)).not.toContain('super-secret')
      expect(String(error)).not.toContain(connectionString)
    },
  )

  it('does not fall back to DATABASE_URL', async () => {
    vi.stubEnv('TEST_DATABASE_URL', undefined)
    vi.stubEnv(
      'DATABASE_URL',
      'postgresql://user:super-secret@localhost:5432/movilis_test',
    )

    await expect(import('./database.js')).rejects.toThrow(
      'TEST_DATABASE_URL is required for backend integration tests',
    )
  })
})
