# Contributing

## Prerequisites

- **Node.js** v26.4.0 (see `.nvmrc` — run `nvm use` to switch)
- **npm** 11.16.0 (shipped with Node)
- **Git**

## Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd astra

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npm run prisma:generate

# 4. Copy environment file and fill in your values
cp .env.example .env

# 5. Run database migrations
npm run prisma:migrate
```

## Development

```bash
# Start the bot (hot-reload with tsx)
npm run dev -w @astra/bot

# Start the dashboard API (Express, port 3001)
npm run dev -w @astra/dashboard -- --filter=api

# Start the dashboard frontend (Vite, port 5173, proxies /api to :3001)
npm run dev -w @astra/dashboard -- --filter=web
```

## Testing

```bash
npm test                  # Run all tests
npm run test:coverage     # With coverage report
```

## Code Style

- **ESLint** — `npm run lint`
- **Prettier** — `npm run format` (run before committing)
- Pre-commit hook runs `lint-staged` automatically on staged files

## Project Structure

```
astra/
├── packages/
│   ├── bot/          # Discord.js bot
│   ├── shared/       # Shared types & API contract (TsRest)
│   └── dashboard/    # Express API + React frontend
├── .husky/           # Git hooks
└── turbo.json        # Turborepo pipeline
```

## Adding a Bot Command

1. Create a file in `packages/bot/src/commands/<category>/<name>.ts`
2. Export a default object following the `Command` interface
3. The command loader auto-registers it

## Adding a Dashboard Page

1. Add a route in `packages/dashboard/src/web/src/App.tsx`
2. Create the page component in `packages/dashboard/src/web/src/pages/`
3. Add an API endpoint in `packages/dashboard/src/api/app.ts`
4. Update the shared contract in `packages/shared/src/index.ts`
