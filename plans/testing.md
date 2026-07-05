# Test Suite Audit

**Date**: 2026-07-05
**Total**: 25 files, ~130 tests

---

## Tier 1 — Genuinely valuable (catching real regressions)

| File                                                  | Tests | Why                                                                                                                  |
| ----------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------- |
| `packages/bot/src/utils/tests/hierarchy.test.ts`      | 7     | Pure function, zero mocks, covers every branch (self-mod, owner, bot, equal roles, success)                          |
| `packages/bot/src/env.test.ts`                        | 3     | Tests Zod schema directly: valid config, default DATABASE_URL, missing-field exit                                    |
| `packages/dashboard/src/api/__tests__/routes.test.ts` | 14    | Https every route with supertest + real Express, sorting/filtering/pagination/error cases, comprehensive Prisma mock |

## Tier 2 — Moderate value (wiring/orchestration)

| File                                                                          | Tests | Why                                                                                                     |
| ----------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------- |
| `packages/bot/src/commands/moderation/tests/moderation.test.ts`               | 22    | 8 commands, success+error paths, escalation thresholds. Heavy service mocking but orchestration is real |
| `packages/bot/src/events/message/tests/messageCreate.test.ts`                 | 6     | 4 code paths (bot skip, link block, word block, XP/levelup). Prisma fully mocked                        |
| `packages/bot/src/events/interaction/tests/interactionCreate.test.ts`         | 6     | Dispatch routing + 3 error-reply states                                                                 |
| `packages/bot/src/commands/settings/tests/settings.test.ts`                   | 7     | 4 subcommands, validates option->Prisma translation                                                     |
| `packages/dashboard/src/web/src/components/__tests__/SortableHeader.test.tsx` | 5     | All visual states + click handler                                                                       |
| `packages/dashboard/src/web/src/components/__tests__/FilterBar.test.tsx`      | 5     | Full interaction surface                                                                                |

## Tier 3 — Low value / rubber-stamping

| File                                                                         | Tests | Problem                                                                        |
| ---------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------ |
| `packages/dashboard/src/web/src/pages/__tests__/Users.test.tsx`              | 3     | Loading/success/empty boilerplate. Zero sorting/filtering/pagination testing   |
| `packages/dashboard/src/web/src/pages/__tests__/Dashboard.test.tsx`          | 4     | Simple render checks + error/empty states                                      |
| `packages/dashboard/src/web/src/pages/__tests__/AuditLog.test.tsx`           | 2     | Same boilerplate                                                               |
| `packages/dashboard/src/web/src/pages/__tests__/Servers.test.tsx`            | 2     | Same boilerplate                                                               |
| `packages/dashboard/src/web/src/pages/__tests__/Warnings.test.tsx`           | 2     | Same boilerplate                                                               |
| `packages/dashboard/src/web/src/components/__tests__/Sidebar.test.tsx`       | 2     | Static content check                                                           |
| `packages/dashboard/src/web/src/components/__tests__/StatsCard.test.tsx`     | 3     | Simple presentational                                                          |
| `packages/dashboard/src/web/src/components/__tests__/ExportButton.test.tsx`  | 3     | Disabled/enabled check. Actual CSV generation untested (jsdom has no Blob/URL) |
| `packages/dashboard/src/web/src/components/__tests__/AuditChart.test.tsx`    | 2     | Chart.js fully mocked, tests just a `<div>`                                    |
| `packages/dashboard/src/web/src/components/__tests__/WarningsChart.test.tsx` | 2     | Same                                                                           |
| `packages/bot/src/commands/utility/tests/ping.test.ts`                       | 2     | Asserts `9ms` from hardcoded timestamps                                        |
| `packages/bot/src/commands/leveling/tests/rank.test.ts`                      | 3     | Prisma mocked, checks reply text                                               |
| `packages/bot/src/commands/leveling/tests/leaderboard.test.ts`               | 2     | Same pattern                                                                   |
| `packages/bot/src/services/auditLog.test.ts`                                 | 4     | Embed path blocked by `instanceof TextChannel` guard                           |
| `packages/bot/src/services/warnings.test.ts`                                 | 4     | Thin Prisma wrappers, tests just re-state the call                             |
| `packages/bot/src/commands/automod/tests/automod.test.ts`                    | 3     | Only 2 subcommands, partial updates untested                                   |

---

## Gaps

- **`packages/shared/`**: zero tests (AuditActions enum, shared types/contracts)
- **Integration tests**: zero. Every test mocks Prisma. SQL-layer bugs invisible
- **UI interaction**: zero. No sorting/filtering/pagination tested on any page
- **Data layer**: every Prisma query is mocked. No real DB queries tested
- **Edge cases**: XP overflow, negative values, empty blocked words, race conditions
- **`serverSettingsCache`**: exists in codebase but has no test file (Phase C of Cleanup Triad not yet executed)

---

## Recommended next work

1. **Write `packages/shared/src/__tests__/index.test.ts`** — test AuditActions enum values, PaginationQuerySchema validation (valid/invalid sortBy, date parsing, action filter)
2. **Write API integration tests** against a test SQLite DB (real Prisma, real queries)
3. **Write page interaction tests** — render a page, click a sort header, verify URL param changes, verify API is called with correct params
