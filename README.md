# Gallium

A Discord moderation bot monorepo built with [discord.js](https://discord.js.org/), TypeScript, and Prisma.

## Packages

| Package           | Description                                             |
| ----------------- | ------------------------------------------------------- |
| `@gallium/bot`    | Discord bot — slash commands, member events, moderation |
| `@gallium/shared` | Shared types and constants                              |

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

```bash
npm install
cp packages/bot/.env.example packages/bot/.env
# Edit packages/bot/.env with your Discord token and client ID
npm run prisma:generate -w @gallium/bot
npm run prisma:migrate -w @gallium/bot
```

## Development

```bash
npm run dev          # Start the bot (ts-node)
npm run deploy       # Register slash commands with Discord
npm run build        # Compile all packages
npm run lint         # Lint all packages
npm run test         # Run tests
```

## Environment variables

| Variable        | Required | Description                                     |
| --------------- | -------- | ----------------------------------------------- |
| `DISCORD_TOKEN` | Yes      | Bot token from the Discord Developer Portal     |
| `CLIENT_ID`     | Yes      | Application client ID (for command deployment)  |
| `DATABASE_URL`  | No       | SQLite database path (default: `file:./dev.db`) |
