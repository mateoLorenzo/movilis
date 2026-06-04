# Carpooling

npm workspaces monorepo.

## Structure

| Path               | Description                              |
| ------------------ | ---------------------------------------- |
| `apps/mobile`      | Expo (React Native) app                  |
| `apps/api`         | Backend _(coming soon)_                  |
| `packages/shared`  | Code shared between front and back       |

## Getting started

```bash
npm install          # installs every workspace (single root node_modules)
npm run mobile       # start the Expo dev server
npm run mobile:ios   # run on iOS
```

Add a dependency to a specific workspace:

```bash
npm install <pkg> --workspace @carpooling/mobile
```
