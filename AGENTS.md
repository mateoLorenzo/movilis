# Movilis monorepo

pnpm workspaces monorepo.

```
movilis/
├── apps/
│   ├── back/        # Backend code (NodeJS w/Fastify). See apps/back/AGENTS.md
│   └── mobile/      # Expo app (React Native). See apps/mobile/AGENTS.md
├── packages/
│   ├── db/          # Database schema and migrations (Drizzle ORM)
│   └── shared/      # Code shared front <-> back (DTOs, contracts)
└── package.json     # workspace root
```

`apps/api/` (backend) will be added once the stack is chosen.

## Working in the monorepo

- pnpm workspaces (`pnpm-workspace.yaml`), single `pnpm-lock.yaml` at the root.
- Add deps to a workspace, not the root: `pnpm --filter @movilis/mobile add <pkg>`.
- Internal packages are declared with the `workspace:*` protocol (e.g. `@carpooling/db` in `apps/back`).
- Shorthand scripts from the root: `pnpm mobile`, `pnpm mobile:ios`, `pnpm mobile:android`.
- Extra args are forwarded to the underlying script: `pnpm db:generate --name=my_migration`.
- Each app/package keeps its own `AGENTS.md` / `CLAUDE.md` with stack-specific rules.
