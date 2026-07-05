# Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Discord.js │────▶│  Bot (Express)   │────▶│   Prisma     │
│   Gateway   │     │  Event-driven    │     │  + LibSQL    │
└─────────────┘     └────────┬─────────┘     └──────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Dashboard API   │
                    │  (TsRest, port   │
                    │   3001)          │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  React Frontend  │
                    │  (Vite, port     │
                    │   5173)          │
                    └──────────────────┘
```

## Monorepo (npm workspaces + Turborepo)

| Package            | Role                  | Tech                           |
| ------------------ | --------------------- | ------------------------------ |
| `@astra/bot`       | Discord bot           | discord.js v14, Prisma, LibSQL |
| `@astra/shared`    | Shared types/contract | TypeScript, TsRest, Zod        |
| `@astra/dashboard` | Web dashboard         | Express, React, Vite, Tailwind |

## Key Design Decisions

- **Event-driven bot** — each event is a file exporting a default `Event` object, auto-loaded by `loadAndRegisterEvents`
- **TsRest contract** — single source of truth for API routes and types, shared between server and client
- **Prisma + LibSQL** — SQLite-compatible with async adapter, single `dev.db` file for local dev
- **Name resolution** — usernames/displayNames/avatars are stored in DB at write time (bot), not resolved at read time (dashboard)
