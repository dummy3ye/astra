# API Reference

Base URL: `http://localhost:3001/api`

All endpoints return JSON. Paginated endpoints accept `?skip=N&take=N&q=search`.

## Servers

| Method | Path                    | Description        |
| ------ | ----------------------- | ------------------ |
| GET    | `/api/servers`          | List all servers   |
| GET    | `/api/servers/:guildId` | Get server details |

## Users

| Method | Path                 | Description                |
| ------ | -------------------- | -------------------------- |
| GET    | `/api/users`         | List all users (paginated) |
| GET    | `/api/users/:userId` | Get user details           |

## Warnings

| Method | Path                | Description                   |
| ------ | ------------------- | ----------------------------- |
| GET    | `/api/warnings`     | List all warnings (paginated) |
| GET    | `/api/warnings/:id` | Get warning details           |

## Audit Log

| Method | Path             | Description                        |
| ------ | ---------------- | ---------------------------------- |
| GET    | `/api/audit-log` | List audit log entries (paginated) |

## Stats

| Method | Path         | Description              |
| ------ | ------------ | ------------------------ |
| GET    | `/api/stats` | Dashboard overview stats |
