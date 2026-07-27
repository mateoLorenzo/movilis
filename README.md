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
| `PORT` | No | `8080` | Backend HTTP port. |
| `ACCESS_TOKEN_TTL_SECONDS` | No | `900` | Access-token lifetime. |
| `REFRESH_TOKEN_TTL_SECONDS` | No | `2592000` | Refresh-token lifetime. |
| `OTP_TTL_SECONDS` | No | `600` | OTP lifetime. |
| `AUTH_EXPOSE_DEV_OTP_CODE` | No | `false` | Return OTP codes in development responses. Never enable in production. |
| `NODE_ENV` | No | - | Set to `production` in production; prevents development OTP exposure. |

The backend listens on `0.0.0.0`, so physical devices on the same network can reach it through the computer's LAN IP.

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
