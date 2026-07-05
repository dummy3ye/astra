# Deployment

## Bot

The bot runs as a long-lived Node.js process connecting to Discord via gateway.

```bash
# Build
npm run build -w @astra/bot

# Start
node packages/bot/dist/index.js
```

Requires `DISCORD_TOKEN` and `DATABASE_URL` in environment.

## Dashboard

### API

```bash
npm run build -w @astra/dashboard -- --filter=api
node packages/dashboard/dist/api/index.js
```

### Frontend (static build)

```bash
npm run build -w @astra/dashboard -- --filter=web
# Serve packages/dashboard/dist/web/ with any static server
```

## Docker

Images are built from `Dockerfile.bot` and `Dockerfile.dashboard` at project root.

## CI/CD

- **GitHub Actions** — test, lint, typecheck, build, release workflows
- **GitLab CI** — `.gitlab-ci.yml` with equivalent pipeline
- **Semantic Release** — automated version bumps and changelog on merge to main
- **Lighthouse CI** — performance/accessibility assertions on dashboard
