# Movilis

pnpm workspaces monorepo with a Fastify backend and an Expo mobile app.

## Prerequisites

- Node.js 22+
- pnpm 11
- PostgreSQL
- iOS Simulator, Android Emulator, or a physical device for the mobile app

Install dependencies from the repository root:

```bash
pnpm install
```

## Database

Create separate development and test databases:

```bash
createdb movilis
createdb movilis_test
```

Drizzle commands run from `packages/db`, so create its local environment file:

```bash
cp packages/db/.env.example packages/db/.env
pnpm db:migrate
```

`packages/db/.env` contains:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL database used by Drizzle commands. |

Update the connection URL if your local PostgreSQL user, password, host, or port differs.

## Backend

```bash
cp apps/back/.env.example apps/back/.env
printf '\nJWT_SECRET=%s\n' "$(openssl rand -base64 32)" >> apps/back/.env
pnpm back:dev
```

`apps/back/.env` supports:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | - | Backend PostgreSQL connection. |
| `TEST_DATABASE_URL` | For tests | - | Dedicated database ending in `_test`; tests reset its tables. |
| `JWT_SECRET` | Yes | - | Random secret of at least 32 UTF-8 bytes. |
| `NODE_ENV` | No | `development` | Closed runtime mode: `development`, `test`, or `production`. Production deployments must set `production`. |
| `PORT` | No | `8080` | Backend HTTP port. |
| `AUTH_TRUST_PROXY` | No | Empty | Comma-separated addresses/CIDRs of controlled proxies whose forwarded client IPs are trusted. |
| `ACCESS_TOKEN_TTL_SECONDS` | No | `900` | Access-token lifetime. |
| `REFRESH_TOKEN_TTL_SECONDS` | No | `2592000` | Refresh-token lifetime. |
| `OTP_TTL_SECONDS` | No | `600` | OTP lifetime. |
| `OTP_CODE_HMAC_SECRET` | Production | - | Dedicated random secret of at least 32 UTF-8 bytes for OTP code hashes; must differ from JWT and rate-limit secrets. |
| `AUTH_RATE_LIMIT_HMAC_SECRET` | Production | - | Dedicated random secret of at least 32 UTF-8 bytes for abuse identifiers; must differ from JWT and OTP secrets. |
| `AUTH_RESEND_COOLDOWN_SECONDS` | No | `60` | Per-phone resend cooldown and request window. |
| `AUTH_PHONE_WINDOW_SECONDS` | No | `900` | Rolling per-phone request window. |
| `AUTH_PHONE_WINDOW_MAX_REQUESTS` | No | `3` | Requests allowed per phone window. |
| `AUTH_IP_WINDOW_SECONDS` | No | `900` | Rolling trusted-client-IP request window. |
| `AUTH_IP_WINDOW_MAX_REQUESTS` | No | `10` | Requests allowed per IP window. |
| `AUTH_DEVICE_WINDOW_SECONDS` | No | `900` | Rolling optional installation-ID request window. |
| `AUTH_DEVICE_WINDOW_MAX_REQUESTS` | No | `5` | Requests allowed per device window. |
| `AUTH_MAX_OTP_ATTEMPTS` | No | `3` | Verification attempts allowed per challenge. |
| `AUTH_OTP_RETENTION_SECONDS` | No | `86400` | Retain terminal OTP challenges for this many seconds; cannot be below 86400 or any configured OTP request window. |
| `AUTH_SESSION_RETENTION_SECONDS` | No | `2592000` | Retain sessions for this many seconds after revocation, or after expiry when not revoked; cannot be below 2592000. |
| `AUTH_CLEANUP_BATCH_SIZE` | No | `500` | Maximum OTP challenges and sessions deleted per cleanup run. |
| `AUTH_EXPOSE_DEV_OTP_CODE` | No | `false` | Return OTP codes in development responses. Never enable in production. |
| `TWILIO_ACCOUNT_SID` | Production | - | Twilio account identifier. |
| `TWILIO_AUTH_TOKEN` | Production | - | Twilio API authentication token. |
| `TWILIO_FROM_NUMBER` | Production sender | - | Twilio source number; configure exactly one source number or messaging service. |
| `TWILIO_MESSAGING_SERVICE_SID` | Production sender | - | Twilio Messaging Service; configure exactly one service or source number. |
| `TWILIO_TIMEOUT_MS` | No | `10000` | Twilio request timeout in milliseconds. |

Generate `JWT_SECRET`, `OTP_CODE_HMAC_SECRET`, and `AUTH_RATE_LIMIT_HMAC_SECRET` independently, for example with `openssl rand -base64 32`; example values such as `change-me` and `replace-me` are rejected in production. Rotating `OTP_CODE_HMAC_SECRET` immediately invalidates every outstanding OTP. Rotating `AUTH_RATE_LIMIT_HMAC_SECRET` changes all identifier hashes, so requests recorded under the old secret no longer count toward current abuse windows; coordinate rotation with an abuse-control maintenance window. The service does not support overlapping old/new HMAC keys.

Set `AUTH_TRUST_PROXY` only to proxies controlled by the deployment. Leaving it empty makes the socket peer the client IP; trusting an uncontrolled proxy or broad network allows spoofed forwarded addresses and weakens IP limits.

The backend listens on `0.0.0.0`, so physical devices on the same network can reach it through the computer's LAN IP.

### Auth cleanup

Run one bounded cleanup batch with:

```bash
pnpm --filter @movilis/back auth:cleanup
```

Each run deletes at most `AUTH_CLEANUP_BATCH_SIZE` expired terminal OTP challenges and the same number of terminal sessions, then prints only the two deleted-row counts. Schedule repeated runs according to the deployment's maintenance policy; a zero/zero result is idempotent. The command requires only `DATABASE_URL` and the three cleanup settings above; it also validates any configured OTP request-window values against OTP retention. It does not require JWT, OTP HMAC, or Twilio credentials.

### Production auth migration cutover

Migration `0002_production_auth_security.sql` deletes legacy OTP challenges and changes their required lifecycle columns under an `ACCESS EXCLUSIVE` table lock. Deploy it only as a stop-the-world cutover, in this exact order:

1. Stop all replicas running the old backend build and confirm none remain connected.
2. Apply database migration `0002_production_auth_security.sql`.
3. Deploy and start only the new backend build with all production auth environment variables configured.

A rolling old/new authentication deployment is forbidden for this migration. Do not start either old or new replicas while the migration is running.

## Mobile

Expo commands run from `apps/mobile`, so create its environment file:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Set `EXPO_PUBLIC_API_URL` to the backend URL visible from the selected runtime:

| Runtime | Example |
| --- | --- |
| iOS Simulator | `http://localhost:8080` |
| Android Emulator | `http://10.0.2.2:8080` |
| Physical device | `http://<computer-lan-ip>:8080` |

Start Expo from the repository root:

```bash
pnpm mobile
# or
pnpm mobile:ios
pnpm mobile:android
```

`EXPO_PUBLIC_API_URL` is bundled into the client and must never contain secrets.

## Verification

With both databases available and the environment files configured:

```bash
pnpm build
pnpm typecheck
pnpm test
```

Backend integration tests refuse to run unless `TEST_DATABASE_URL` names a database ending in `_test`.

## Structure

| Path | Description |
| --- | --- |
| `apps/back` | Fastify backend |
| `apps/mobile` | Expo mobile app |
| `packages/db` | Drizzle schema and migrations |
| `packages/shared` | Shared runtime API contracts |
