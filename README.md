# Carpooling

npm workspaces monorepo.

## Structure

| Path              | Description                        |
| ----------------- | ---------------------------------- |
| `apps/mobile`     | Expo (React Native) app            |
| `apps/api`        | Backend                            |
| `packages/shared` | Code shared between front and back |

## Getting started

```bash
npm install
npm run mobile
npm run mobile:ios
```

Add a dependency to a specific workspace:

```bash
npm install <pkg> --workspace @carpooling/mobile
```
