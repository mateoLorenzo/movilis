# Carpooling

npm workspaces monorepo.

## Structure

| Path              | Description                                |
| ----------------- | ------------------------------------------ |
| `apps/back`       | Fastify backend                            |
| `apps/mobile`     | Expo (React Native) app                    |
| `packages/db`     | Drizzle ORM schema and migrations          |
| `packages/shared` | Code shared between frontend and backend   |

## Getting started

```bash
npm install
npm run mobile
npm run mobile:ios
```

Run the backend:

```bash
cp apps/back/.env.example apps/back/.env
npm run back:dev
```

Database commands:

```bash
npm run db:generate --name=<migration-name>
npm run db:migrate
```

Add a dependency to a specific workspace:

```bash
npm install <pkg> --workspace @carpooling/mobile
```
