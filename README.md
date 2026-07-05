# Astra

A Discord moderation bot monorepo built with [discord.js](https://discord.js.org/), TypeScript, and Prisma.

## Packages

| Package           | Description                                             |
| ----------------- | ------------------------------------------------------- |
| `@astra/bot`      | Discord bot — slash commands, member events, moderation |
| `@astra/dashboard`| Web dashboard for server management                     |
| `@astra/shared`   | Shared types and constants                              |

## Prerequisites

- Node.js 26+
- npm 10+

## Setup

```bash
npm install
cp packages/bot/.env.example packages/bot/.env
# Edit packages/bot/.env with your Discord token and client ID
npm run prisma:generate
npm run prisma:migrate
```

## Development

```bash
npm run dev          # Start the bot
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
