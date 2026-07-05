# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-07-05

### Added

- **Data Loom**: sortable column headers with asc/desc toggle, client-side column filters with chip UI, CSV export on all table pages (Servers, Users, Warnings, Audit Log)
- Server-side sorting and date-range filtering for Warnings and Audit Log API endpoints via Prisma `orderBy`/`where`
- Action-type dropdown filter on Audit Log page
- URL-persisted table state via `useSearchParams` (bookmarkable, shareable links)
- `useTableState` hook: debounced search (300ms), sort toggle, filter management, date range
- `SortableHeader`, `ExportButton`, `FilterBar` reusable components with tests
- 404 error page with "Back to Dashboard" link (catch-all route instead of silent redirect)
- 5 API route tests for sort/filter params; 13 component tests for SortableHeader, ExportButton, FilterBar

### Changed

- Rebranded from "gallium" to "astra" across 32 files: package names (`@gallium/*` → `@astra/*`), imports, display strings, CI pipeline names
- Switched bot dev/deploy scripts from `ts-node` to `tsx` for Node 26 ESM compatibility

## [1.2.0] - 2026-07-03

### Added

- Name resolution across bot, API, and dashboard: `User` stores `username`, `displayName`, `avatar`; `ServerSettings` stores `name`, `icon`; `AuditLog` stores `targetName`, `moderatorId`, `moderatorName`
- `guildCreate` event handler — creates `ServerSettings` row immediately when bot joins a guild
- `ready` event seeds all guilds into `ServerSettings` on startup
- Bot `messageCreate` handler populates server name/icon on every message
- Dashboard UI shows both `displayName` and `@username` on Users, Warnings pages; target/moderator name + snowflake on AuditLog page

### Changed

- `prisma.serverSettings` upsert added to `messageCreate.ts`, `guildCreate.ts`, and `ready.ts`
- All moderation commands, member events, audit log, and warning services persist name fields

### Fixed

- Server count was always zero because no code populated `ServerSettings` rows — now seeded on startup, guild join, and message processing

## [1.1.0] - 2026-07-03

### Added

- Pagination and search across Users, Warnings, and Audit Log pages
- `Pagination` React component with page controls, ellipsis, and auto-hide
- Search inputs with real-time filtering on all three data pages
- Animated skeleton components (StatsCardSkeleton, TableSkeleton, ChartSkeleton)
- `createApp(opts?)` API factory with injectable PrismaClient for isolated testing
- 36 dashboard tests (10 API integration + 26 frontend component/page tests)
- Vitest project configuration with jsdom environment and setup file
- `CHANGELOG.md` with versioned release history

### Changed

- API `getUsers`, `getWarnings`, `getAuditLog` handlers accept `{ skip, take, q }` query params
- API responses now return `{ items: [...], total: N }` instead of bare arrays
- All 5 dashboard pages display skeletons during loading instead of bare text
- Removed unused `.page-loading` CSS class

### Fixed

- React version mismatch: installed React 18.3.1 at root level to resolve testing-library hoisting conflict with React 19 (pulled in by Prisma Studio)
- `vi.mock` hoisting issues in page tests using `vi.hoisted()`
- Mock module path resolution in page tests (`../../api` instead of `../api`)
- Removed `strictStatusCodes: false` from TsRest contract to restore correct type inference on response bodies

## [1.0.0] - 2025-07-02

### Added

- Turborepo monorepo with npm workspaces
- `@astra/bot`, `@astra/shared`, `@astra/dashboard` package structure

### Changed

- Migrated flat project structure into monorepo layout
- Unified shared types and API contract via `@astra/shared`
- Consolidated root scripts to use `turbo run`

## [0.3.0] - 2025-07-01

### Added

- Dashboard API with Express, TsRest, and PrismaLibSql adapter
- React frontend with Vite, React Router 6, and Tailwind v4
- Chart.js integration: audit action doughnut chart, warnings bar chart
- Vercel-style dark theme with SCSS and CSS custom properties
- Pages: Overview, Servers, Users, Warnings, Audit Log
- Lighthouse CI with performance and accessibility assertions

### Fixed

- Type inference issue with TsRest client destructuring
- Zod version conflict between bot (v4) and shared (v3)

## [0.2.0] - 2025-06-30

### Added

- Moderation commands: ban, kick, purge, warn, timeout
- Leveling commands: rank, leaderboard
- Automod commands: word blocking, link blocking
- Settings command: server configuration management
- Warning and audit log services with Prisma + LibSQL
- Hierarchy permission checks for moderation

### Fixed

- Interaction handler test reliability with live binding mocking

## [0.1.0] - 2025-06-29

### Added

- Discord.js v14 bot with Prisma + LibSQL database
- Command framework with slash command deployment
- Event handlers for message and interaction events
- Ping utility command
- Environment configuration with validation
- Vitest test suite with 76 tests
