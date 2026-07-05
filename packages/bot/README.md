# @astra/bot

Discord moderation bot — slash commands, member events, automod, and warning management.

Built with [discord.js](https://discord.js.org/), TypeScript, and Prisma.

## Commands

- **moderation**: ban, kick, warn, timeout, untimeout, purge, clearwarns
- **automod**: link blocking, word filtering
- **leveling**: rank, leaderboard
- **settings**: per-guild server configuration
- **utility**: ping

## Environment

| Variable        | Required | Description                                    |
| --------------- | -------- | ---------------------------------------------- |
| `DISCORD_TOKEN` | Yes      | Bot token from the Discord Developer Portal    |
| `CLIENT_ID`     | Yes      | Application client ID                          |
| `DATABASE_URL`  | No       | SQLite path (default: `file:./dev.db`)         |
