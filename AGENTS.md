# Carpooling monorepo

npm workspaces monorepo.

```
carpooling/
├── apps/
│   └── mobile/      # Expo app (React Native). See apps/mobile/AGENTS.md
├── packages/
│   └── shared/      # Code shared front <-> back (DTOs, contracts)
└── package.json     # workspace root
```

`apps/api/` (backend) will be added once the stack is chosen.

## Working in the monorepo

- Single `node_modules` at the root (deps are hoisted by npm workspaces).
- Add deps to a workspace, not the root: `npm install <pkg> --workspace @carpooling/mobile`.
- Shorthand scripts from the root: `npm run mobile`, `npm run mobile:ios`, `npm run mobile:android`.
- Each app/package keeps its own `AGENTS.md` / `CLAUDE.md` with stack-specific rules.
