import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)

describe('backend entrypoint', () => {
  it('prints only a fixed message when startup fails with secret-bearing input', async () => {
    const secretDatabaseUrl =
      'postgresql://secret-user:secret-password@127.0.0.1:1/secret-db'

    let failure: unknown
    try {
      await execFileAsync('pnpm', ['--silent', 'exec', 'tsx', 'index.ts'], {
        cwd: new URL('..', import.meta.url),
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          USER: process.env.USER,
          NODE_ENV: 'development',
          DATABASE_URL: secretDatabaseUrl,
          JWT_SECRET: 'a-secure-test-jwt-secret-at-least-32-bytes',
        },
      })
    } catch (error) {
      failure = error
    }

    expect(failure).toMatchObject({
      code: 1,
      stdout: '',
      stderr: 'Backend startup failed\n',
    })
    const stderr = (failure as { stderr: string }).stderr
    for (const secret of [
      secretDatabaseUrl,
      'secret-user',
      'secret-password',
      '127.0.0.1',
      'ECONNREFUSED',
      'Error:',
      'at ',
    ]) {
      expect(stderr).not.toContain(secret)
    }
  })
})
