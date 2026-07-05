# Case: Cleanup Triad — Node 26 Unification, Zod v4 Migration, Member Events
**Status**: APPROVED
**Date**: 2026-07-04

---

## Implementation Plan

Three independent phases, ordered logically (de-risking first):

1. **Phase A — Node 26 Unification** (runtime + CI alignment)
2. **Phase B — Zod v4 Migration** (deps + code fix)
3. **Phase C — Member Events** (dead code, tag deprecation, caching)

---

## Phase A: Node 26 Unification

### Files to Modify (11 files)

#### 1. `Dockerfile.bot`
- **Line 1**: `FROM node:20-alpine AS builder` → `FROM node:26-alpine AS builder`
- **Line 13**: `FROM node:20-alpine AS runner` → `FROM node:26-alpine AS runner`

#### 2. `Dockerfile.dashboard`
- **Line 1**: `FROM node:20-alpine AS builder` → `FROM node:26-alpine AS builder`
- **Line 14**: `FROM node:20-alpine AS runner` → `FROM node:26-alpine AS runner`

#### 3. `.github/workflows/build.yml`
- **Line 9**: `NODE_VERSION: "20"` → `NODE_VERSION: "26"`

#### 4. `.github/workflows/test.yml`
- **Line 9**: `NODE_VERSION: "20"` → `NODE_VERSION: "26"`

#### 5. `.github/workflows/lint.yml`
- **Line 9**: `NODE_VERSION: "20"` → `NODE_VERSION: "26"`

#### 6. `.github/workflows/typecheck.yml`
- **Line 9**: `NODE_VERSION: "20"` → `NODE_VERSION: "26"`

#### 7. `.github/workflows/release.yml`
- **Line 21**: `node-version: "20"` → `node-version: "26"`

#### 8. `.github/workflows/lighthouse.yml`
- **Line 15**: `node-version: "20"` → `node-version: "26"`

#### 9. `.gitlab-ci.yml`
- **Line 1**: `image: node:20` → `image: node:26`

#### 10. `README.md`
- **Line 14**: `Node.js 18+` → `Node.js 26+`

#### 11. `packages/dashboard/package.json`
- **Line 34**: `"@types/node": "^20.0.0"` → `"@types/node": "^26.0.0"`

### No Changes Needed
- `.nvmrc` — already `v26.4.0` ✓
- `.github/workflows/docker.yml` — no Node version set, uses Dockerfiles (updated above) ✓
- `.github/workflows/codeql.yml` — CodeQL manages its own runtime ✓
- `.github/workflows/stale.yml` — no Node setup step ✓
- `.github/workflows/labeler.yml` — no Node setup step ✓
- `packages/bot/package.json` — no `@types/node` dependency ✓
- `packages/shared/tsconfig.json`, `packages/bot/tsconfig.json`, `tsconfig.base.json` — `target: ES2022` already, no change needed ✓

### Step-by-Step
1. Edit `Dockerfile.bot` — 2 replacements (builder + runner images)
2. Edit `Dockerfile.dashboard` — 2 replacements (builder + runner images)
3. Edit 6 GitHub workflow files — change `"20"` → `"26"`
4. Edit `.gitlab-ci.yml` — change `node:20` → `node:26`
5. Edit `README.md` — change `18+` → `26+`
6. Edit `packages/dashboard/package.json` — bump `@types/node`
7. Run `npm install` to update lockfile and `@types/node`

### Verification
- `node --version` should show `v26.x`
- `npm run build` succeeds across all packages
- `npm test` passes
- `npm run typecheck` passes

---

## Phase B: Zod v4 Migration

### Files to Modify (3 files)

#### 1. `packages/shared/package.json`
- **Line 11**: `"@ts-rest/core": "^3.52.1"` → `"@ts-rest/core": "3.53.0-rc.1"` (pinned exact)
- **Line 12**: `"zod": "^3.25.76"` → `"zod": "^4.4.3"`

#### 2. `packages/dashboard/package.json`
- **Line 17**: `"@ts-rest/core": "^3.52.1"` → `"@ts-rest/core": "3.53.0-rc.1"` (pinned exact)
- **Line 18**: `"@ts-rest/express": "^3.52.1"` → `"@ts-rest/express": "3.53.0-rc.1"` (pinned exact)
- **Line 26**: `"zod": "^3.25.76"` → `"zod": "^4.4.3"`

#### 3. `packages/shared/src/index.ts`
- **Line 110**: `.default('0')` → `.default(0)` — Zod v4 `.default()` short-circuits, so default must be the final type (number), not a string
- **Line 111**: `.default('20')` → `.default(20)` — same reason
- **Line 117**: `z.ZodTypeAny` → `z.ZodType` — `ZodTypeAny` was removed in v4, `ZodType` is the base type

### Dependencies
- After editing package.json files: run `npm install` to update lockfile

### Step-by-Step
1. Edit `packages/shared/package.json` — bump zod and @ts-rest/core
2. Edit `packages/dashboard/package.json` — bump zod, @ts-rest/core, @ts-rest/express
3. Edit `packages/shared/src/index.ts` — 3 code changes listed above
4. Run `npm install` to resolve new versions
5. Run `npm run build -w @astra/shared` — verifies shared compiles with Zod v4
6. Run `npm run typecheck` — catches any type mismatches across all packages
7. Run `npm test` — confirms runtime behavior

### Test Plan
- Existing tests in `packages/bot`, `packages/dashboard`, `packages/shared` must all pass
- Zod v4 may produce different error messages; no test asserts on Zod error strings currently, but verify none break
- Pay special attention to `packages/shared/src/index.ts` contract types — the PaginatedResponseSchema generic uses `z.ZodType` now

### Accepted Risks
- **@ts-rest 3.53.0-rc.1**: Release candidate, pinned exact. If the RC is yanked or has a blocking bug, fall back to keeping Zod v3 on `shared` and `dashboard` packages (bot already on v4). The bot's own usage is fine since it only uses Zod for runtime parsing, not ts-rest contracts.

---

## Phase C: Member Events

### Files to Delete (1 file)

#### 1. `packages/bot/src/events/member/memberEvents.ts`
- Contains `handleGuildMemberAdd` and `handleGuildMemberRemove` as named exports
- **Not imported anywhere** in the codebase (confirmed by grep)
- The event loader (`events/index.ts`) skips it because it `import`s `eventModule.default` — this file has no default export, so it produces a console warning and is skipped at runtime
- Safe to delete

### Files to Create (1 file)

#### 2. `packages/bot/src/services/serverSettingsCache.ts`
New in-memory cache with TTL for `ServerSettings` lookups:

```ts
import { prisma } from '../database/client';
import type { ServerSettings } from '@prisma/client';

interface CacheEntry {
  data: ServerSettings | null;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000; // 1 minute

export async function getServerSettings(guildId: string): Promise<ServerSettings | null> {
  const entry = cache.get(guildId);
  if (entry && entry.expiry > Date.now()) {
    return entry.data;
  }

  const data = await prisma.serverSettings.findUnique({ where: { guildId } });
  cache.set(guildId, { data, expiry: Date.now() + TTL_MS });
  return data;
}

export function invalidateServerSettings(guildId: string): void {
  cache.delete(guildId);
}

// For testing: reset cache
export function _resetCache(): void {
  cache.clear();
}
```

- Import path: `import { getServerSettings } from '../../services/serverSettingsCache'`

### Files to Modify (2 files)

#### 3. `packages/bot/src/events/member/guildMemberAdd.ts`
- **Line 4**: Remove `import { prisma } from '../../database/client';` (no longer needed if caching is the only DB call; but keep if other DB calls exist — check: it only uses prisma for serverSettings.findUnique. Remove it.)
  - Actually, `prisma` import is only used on line 10 for `prisma.serverSettings.findUnique`. Replace that call with `getServerSettings`.
  - So: Remove `import { prisma } from '../../database/client';`
  - Add `import { getServerSettings } from '../../services/serverSettingsCache';`
- **Line 10-12**: Replace:
  ```ts
  const settings = await prisma.serverSettings.findUnique({
    where: { guildId: member.guild.id },
  });
  ```
  with:
  ```ts
  const settings = await getServerSettings(member.guild.id);
  ```
- **Line 19**: `member.user.tag` → `member.user.username` — `tag` is deprecated in discord.js v14; returns `username` + discriminator, but Discord has migrated to unique usernames. Use `username` directly.

Final file should look like:
```ts
import { GuildMember, TextChannel } from 'discord.js';
import { AuditActions } from '@astra/shared';
import { logAudit } from '../../services/auditLog';
import { getServerSettings } from '../../services/serverSettingsCache';
import { Event } from '../event';

const guildMemberAddEvent: Event<'guildMemberAdd'> = {
  name: 'guildMemberAdd',
  execute: async (member: GuildMember) => {
    const settings = await getServerSettings(member.guild.id);

    if (settings?.welcomeChannelId) {
      const channel = member.guild.channels.cache.get(
        settings.welcomeChannelId
      ) as TextChannel;
      if (channel) {
        await channel.send(`Welcome to the server, ${member.user.username}!`);
      }
    }

    await logAudit({
      guildId: member.guild.id,
      action: AuditActions.MEMBER_JOIN,
      targetId: member.id,
      targetName: member.user.displayName,
    });
  },
};

export default guildMemberAddEvent;
```

#### 4. `packages/bot/src/events/member/guildMemberRemove.ts`
- **Line 4**: Remove `import { prisma } from '../../database/client';`
- Add `import { getServerSettings } from '../../services/serverSettingsCache';`
- **Lines 10-12**: Replace `prisma.serverSettings.findUnique` with `getServerSettings(member.guild.id)`
- **Line 20**: `member.user?.tag` → `member.user?.username`

Final file should look like:
```ts
import { GuildMember, PartialGuildMember, TextChannel } from 'discord.js';
import { AuditActions } from '@astra/shared';
import { logAudit } from '../../services/auditLog';
import { getServerSettings } from '../../services/serverSettingsCache';
import { Event } from '../event';

const guildMemberRemoveEvent: Event<'guildMemberRemove'> = {
  name: 'guildMemberRemove',
  execute: async (member: GuildMember | PartialGuildMember) => {
    const settings = await getServerSettings(member.guild.id);

    if (settings?.logChannelId) {
      const channel = member.guild.channels.cache.get(
        settings.logChannelId
      ) as TextChannel;
      if (channel) {
        await channel.send(
          `${member.user?.username || 'A user'} has left the server.`
        );
      }
    }

    await logAudit({
      guildId: member.guild.id,
      action: AuditActions.MEMBER_LEAVE,
      targetId: member.id,
      targetName: member.user?.displayName,
    });
  },
};

export default guildMemberRemoveEvent;
```

### Test Plan

#### New: `packages/bot/src/services/serverSettingsCache.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { _resetCache, getServerSettings, invalidateServerSettings } from './serverSettingsCache';

const mockFindUnique = vi.fn();

vi.mock('../database/client', () => ({
  prisma: {
    serverSettings: {
      findUnique: mockFindUnique,
    },
  },
}));

describe('serverSettingsCache', () => {
  beforeEach(() => {
    _resetCache();
    mockFindUnique.mockReset();
  });

  it('returns null when settings do not exist', async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await getServerSettings('guild-1');
    expect(result).toBeNull();
  });

  it('fetches from DB on first call, cache on second', async () => {
    const settings = { guildId: 'guild-1', welcomeChannelId: 'ch-1' };
    mockFindUnique.mockResolvedValue(settings);

    const first = await getServerSettings('guild-1');
    expect(first).toEqual(settings);
    expect(mockFindUnique).toHaveBeenCalledTimes(1);

    const second = await getServerSettings('guild-1');
    expect(second).toEqual(settings);
    // No additional DB call
    expect(mockFindUnique).toHaveBeenCalledTimes(1);
  });

  it('refetches after invalidation', async () => {
    const oldSettings = { guildId: 'guild-1', welcomeChannelId: 'ch-1' };
    const newSettings = { guildId: 'guild-1', welcomeChannelId: 'ch-2' };
    mockFindUnique.mockResolvedValueOnce(oldSettings).mockResolvedValueOnce(newSettings);

    await getServerSettings('guild-1');
    invalidateServerSettings('guild-1');
    const result = await getServerSettings('guild-1');

    expect(result).toEqual(newSettings);
    expect(mockFindUnique).toHaveBeenCalledTimes(2);
  });

  it('refetches after TTL expiry', async () => {
    vi.useFakeTimers();
    const settings = { guildId: 'guild-1', welcomeChannelId: 'ch-1' };
    mockFindUnique.mockResolvedValue(settings);

    await getServerSettings('guild-1');
    expect(mockFindUnique).toHaveBeenCalledTimes(1);

    // Advance time beyond 1 minute TTL
    vi.advanceTimersByTime(61_000);
    await getServerSettings('guild-1');

    expect(mockFindUnique).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
```

#### No existing tests need modification
- `guildMemberAdd.ts` and `guildMemberRemove.ts` have no existing test files
- The `auditLog.test.ts` mocks `prisma.serverSettings.findUnique` directly; it does not use the cache, so it continues to work unchanged

### Step-by-Step
1. Create `packages/bot/src/services/serverSettingsCache.ts`
2. Create `packages/bot/src/services/serverSettingsCache.test.ts`
3. Delete `packages/bot/src/events/member/memberEvents.ts`
4. Edit `packages/bot/src/events/member/guildMemberAdd.ts` — swap import, use cache, fix `.tag` → `.username`
5. Edit `packages/bot/src/events/member/guildMemberRemove.ts` — swap import, use cache, fix `.tag` → `.username`
6. Run `npm test` — verify cache tests pass
7. Run `npm run build -w @astra/bot` — verify compilation
8. Run `npm run typecheck` — verify no type errors

### Data Flow (Caching)
```
guildMemberAdd / guildMemberRemove
  → getServerSettings(guildId)
    → cache.has(guildId) && !expired?
      → YES: return cached data (no DB)
      → NO:  prisma.serverSettings.findUnique → cache.set → return data
  → use settings.welcomeChannelId / settings.logChannelId
  → send message + logAudit
```

---

## Accepted Risks

| Risk | Mitigation |
|---|---|
| **@ts-rest 3.53.0-rc.1** may have bugs or be yanked | Pinned exact version; if blocking, revert Zod v3 on shared+dashboard |
| **Node 26-alpine Docker image** may not exist in CI | Use `node:26-slim` as fallback; July 2026 should have stable `node:26-alpine` |
| **Cache staleness**: ServerSettings updated in another process | 1-minute TTL bounds staleness; `invalidateServerSettings()` exported for write paths to call later |
| **Cache memory growth**: unbounded Map | In practice, a bot serves a bounded number of guilds (<10K); not a concern. Add LRU eviction if needed later |
| **`.tag` deprecation**: removing `discriminator` info from welcome messages | Discord has fully migrated to unique usernames; `username` alone is the correct modern field |

---

# Case: Data Loom — Sortable, Filterable, Exportable Data Tables
**Status**: APPROVED
**Date**: 2026-07-05

---

## Implementation Plan

### Files to Create (4)

#### 1. `packages/dashboard/src/web/src/hooks/useTableState.ts`

```ts
import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

interface TableState {
  sortBy: string | undefined;
  sortOrder: 'asc' | 'desc';
  page: number;
  search: string;
  filters: Record<string, string>;
  dateFrom: string | undefined;
  dateTo: string | undefined;
}

interface UseTableStateReturn extends TableState {
  setSortBy: (field: string) => void;
  clearSort: () => void;
  setPage: (page: number) => void;
  setSearch: (query: string) => void;
  setFilter: (field: string, value: string) => void;
  removeFilter: (field: string) => void;
  clearFilters: () => void;
  setDateFrom: (date: string | undefined) => void;
  setDateTo: (date: string | undefined) => void;
}
```

Logic:
- Wraps `useSearchParams` as single source of truth for URL state
- `setSortBy(field)`: if same field clicked, toggle order (asc→desc→asc); if different field, set asc
- `setPage(n)`: updates page param; resets to 1 automatically when sort/search/filter changes
- `setSearch(q)`: stores in URL, resets page to 1; debounce 300ms via local `useState` + `useEffect` with timeout
- Filters stored as `Record<string, string>` in URL params with `filter_` prefix (e.g., `filter_action=ban`)
- `dateFrom`/`dateTo` stored as `startDate`/`endDate` URL params

#### 2. `packages/dashboard/src/web/src/components/SortableHeader.tsx`

```ts
interface SortableHeaderProps {
  field: string;
  label: string;
  currentSortBy?: string;
  currentSortOrder?: 'asc' | 'desc';
  onSort: (field: string) => void;
}
```

Renders: clickable `<th>` with label + arrow indicator (`▲` asc, `▼` desc, no arrow when not sorted by this field). Clicking calls `onSort(field)`.

#### 3. `packages/dashboard/src/web/src/components/ExportButton.tsx`

```ts
interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns: { key: string; label: string }[];
}
```

Logic: serializes `data` to CSV using `columns` for header row + key mapping. Uses `Blob` + `URL.createObjectURL` + hidden `<a>` click for download. File extension `.csv`.

#### 4. `packages/dashboard/src/web/src/components/FilterBar.tsx`

```ts
interface FilterBarProps {
  filters: Record<string, string>;
  onRemoveFilter: (field: string) => void;
  onClearAll: () => void;
  children?: React.ReactNode;
}
```

Renders: horizontal row of filter chips (pill badges with "×" remove button) + "Clear All" button when any filter active. `children` slot for search input, date pickers, dropdowns.

---

### Files to Modify (9)

#### 5. `packages/shared/src/index.ts`

**PaginationQuerySchema** (lines 109-113): Add fields:
```ts
export const PaginationQuerySchema = z.object({
  skip: z.string().transform(Number).pipe(z.number().int().min(0)).default(0),
  take: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default(20),
  q: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  action: z.string().optional(),
});
```

**getServers contract** (line 144-151): Add query schema:
```ts
getServers: {
  method: 'GET',
  path: '/api/servers',
  query: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  }),
  responses: {
    200: z.array(ServerSchema),
    500: ErrorSchema,
  },
},
```

#### 6. `packages/dashboard/src/api/app.ts`

**getServers handler** (line 92): Destructure query params but ignore them (client-side sort):
```ts
getServers: async ({ query: { sortBy, sortOrder } }) => { ... }
```

**getUsers handler** (line 114):
```ts
const { skip, take, q, sortBy, sortOrder } = query;
const SORTABLE_USER_FIELDS = ['id', 'guildId', 'xp', 'level', 'username', 'displayName'];
const orderBy = sortBy && SORTABLE_USER_FIELDS.includes(sortBy)
  ? { [sortBy]: sortOrder ?? 'asc' }
  : { xp: 'desc' };
```
Pass `orderBy` to `prisma.user.findMany({ ..., orderBy })`.

**getWarnings handler** (line 150):
```ts
const { skip, take, q, sortBy, sortOrder, startDate, endDate } = query;
const SORTABLE_WARNING_FIELDS = ['id', 'userId', 'guildId', 'reason', 'createdAt'];
const orderBy = sortBy && SORTABLE_WARNING_FIELDS.includes(sortBy)
  ? { [sortBy]: sortOrder ?? 'asc' }
  : { createdAt: 'desc' };
const where = {
  ...(q ? { OR: [{ userId: { contains: q } }, { reason: { contains: q } }, { guildId: { contains: q } }] } : {}),
  ...(startDate || endDate ? { createdAt: { ...(startDate ? { gte: new Date(startDate) } : {}), ...(endDate ? { lte: new Date(endDate) } : {}) } } : {}),
};
```
Pass `orderBy` and `where` to `prisma.warning.findMany({ ..., orderBy, where })`.

**getAuditLog handler** (line 188):
```ts
const { skip, take, q, sortBy, sortOrder, startDate, endDate, action } = query;
const SORTABLE_AUDIT_FIELDS = ['id', 'guildId', 'action', 'targetId', 'targetName', 'moderatorId', 'moderatorName', 'reason', 'createdAt'];
const orderBy = sortBy && SORTABLE_AUDIT_FIELDS.includes(sortBy)
  ? { [sortBy]: sortOrder ?? 'asc' }
  : { createdAt: 'desc' };
const where = {
  ...(q ? { OR: [{ targetId: { contains: q } }, { action: { contains: q } }, { guildId: { contains: q } }, { reason: { contains: q } }] } : {}),
  ...(action ? { action } : {}),
  ...(startDate || endDate ? { createdAt: { ...(startDate ? { gte: new Date(startDate) } : {}), ...(endDate ? { lte: new Date(endDate) } : {}) } } : {}),
};
```

Invalid sortBy: silently ignored, use default sort. Invalid sortOrder: default to 'asc'.

#### 7. `packages/dashboard/src/web/src/pages/Servers.tsx`
- Import `useTableState` hook
- Replace `useState` for loading/servers — keep `useState` for loading and data only; sort/filter state from hook
- Add `<SortableHeader>` on all columns (Server, Guild ID, Members, Warnings, Link Block, Blocked Words, Timeout At, Ban At, Level Roles)
- Client-side sorting: after fetch, `const sorted = [...servers].sort(...)` based on `sortBy`/`sortOrder`. Map field names to sort accessors (e.g., "members" → `s.memberCount`, "server" → `(s.name || s.guildId)`)
- Add `<FilterBar>` with column-specific client-side filters
- Add `<ExportButton>` with columns config
- Debounced search input (`search` from hook) applies client-side filter
- URL params: `sortBy`, `sortOrder`, `q`
- No pagination (all data loaded)

#### 8. `packages/dashboard/src/web/src/pages/Users.tsx`
- Replace `useState` for page/search with `useTableState`
- Add `<SortableHeader>` on: User, User ID, Guild ID, Level, XP, Warnings
- Pass `sortBy`, `sortOrder` to API call: `client.getUsers({ query: { skip, take, q, sortBy, sortOrder } })`
- Server-side sort for Level, XP, User ID, Guild ID (direct Prisma fields)
- "User" column (displayName/username) and "Warnings" (virtual count) — NOT server-sortable
- Add `<ExportButton>`, `<FilterBar>`, debounced search
- URL params: `page`, `sortBy`, `sortOrder`, `q`

#### 9. `packages/dashboard/src/web/src/pages/Warnings.tsx`
- Replace `useState` for page/search with `useTableState`
- Add `<SortableHeader>` on: ID, User, User ID, Guild ID, Reason, User Level, User XP, Date
- Pass `sortBy`, `sortOrder`, `startDate`, `endDate` to API call
- Add two `<input type="date">` for date range, wired to `setDateFrom`/`setDateTo`
- Add `<ExportButton>`, `<FilterBar>`, debounced search
- URL params: `page`, `sortBy`, `sortOrder`, `q`, `startDate`, `endDate`

#### 10. `packages/dashboard/src/web/src/pages/AuditLog.tsx`
- Replace `useState` for page/search with `useTableState`
- Add `<SortableHeader>` on: ID, Guild ID, Action, Target, Moderator, Reason, Date
- Pass `sortBy`, `sortOrder`, `startDate`, `endDate`, `action` to API call
- Add `<select>` dropdown for action type filter (all actions from AuditActions enum)
- Add two `<input type="date">` for date range
- Add `<ExportButton>`, `<FilterBar>`, debounced search
- URL params: `page`, `sortBy`, `sortOrder`, `q`, `startDate`, `endDate`, `action`

#### 11. `packages/dashboard/src/web/src/pages/Dashboard.tsx`
- **No changes.** Recent Warnings mini-table has only 5 rows; sorting adds no value.

#### 12. `packages/dashboard/src/web/src/styles/index.scss`
Add classes (append before end of file):
```scss
.sort-header {
  cursor: pointer;
  user-select: none;
  &:hover { color: var(--text-primary); }
}
.sort-asc::after { content: ' ▲'; font-size: 10px; }
.sort-desc::after { content: ' ▼'; font-size: 10px; }

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
}
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 999px;
  font-size: 12px;
  color: var(--accent);
}
.filter-chip-remove {
  cursor: pointer;
  opacity: 0.6;
  &:hover { opacity: 1; }
}
.filter-clear-all {
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  &:hover { color: var(--text-primary); }
}

.export-btn {
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover {
    background: rgba(255,255,255,0.06);
    color: var(--text-primary);
  }
}

.date-range-input {
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  &:focus { border-color: var(--accent); }
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}
```

#### 13. `packages/dashboard/src/api/__tests__/routes.test.ts`
Add test cases:
- `GET /api/users?sortBy=xp&sortOrder=desc` returns 200 with items sorted by XP descending (verify prisma.findMany called with `orderBy: { xp: 'desc' }`)
- `GET /api/warnings?sortBy=createdAt&sortOrder=asc` returns 200
- `GET /api/audit-log?sortBy=action&sortOrder=asc&action=ban` returns 200
- `GET /api/warnings?startDate=2026-01-01&endDate=2026-06-30` returns filtered results
- `GET /api/audit-log?action=ban` returns 200 (filtered)
- `GET /api/users?sortBy=invalidField` returns 200 with default sort (no error)
- `GET /api/servers?sortBy=name&sortOrder=asc` returns 200 (params accepted, sorting client-side)

---

### Dependencies

- None. All features use existing packages: `react-router-dom` (useSearchParams), `react`, `@ts-rest/core`, `@prisma/client`, `zod`.

---

### Implementation Order

1. `packages/shared/src/index.ts` — contract changes (PaginationQuerySchema + getServers query schema)
2. `npm run build -w @astra/shared` — rebuild shared
3. `packages/dashboard/src/api/app.ts` — handler changes (all 4 routes)
4. `packages/dashboard/src/web/src/hooks/useTableState.ts` — new hook
5. `packages/dashboard/src/web/src/components/SortableHeader.tsx` — new component
6. `packages/dashboard/src/web/src/components/ExportButton.tsx` — new component
7. `packages/dashboard/src/web/src/components/FilterBar.tsx` — new component
8. `packages/dashboard/src/web/src/pages/Servers.tsx` — integrate hook + components
9. `packages/dashboard/src/web/src/pages/Users.tsx` — integrate hook + components
10. `packages/dashboard/src/web/src/pages/Warnings.tsx` — integrate hook + components
11. `packages/dashboard/src/web/src/pages/AuditLog.tsx` — integrate hook + components
12. `packages/dashboard/src/web/src/styles/index.scss` — add SCSS classes
13. `packages/dashboard/src/api/__tests__/routes.test.ts` — add sort route tests
14. Add component tests for SortableHeader, ExportButton, FilterBar (new test files)
15. `npm run typecheck && npm test` — verify

---

### Test Plan

| Test | File | Cases |
|---|---|---|
| Route sort tests | `packages/dashboard/src/api/__tests__/routes.test.ts` | 7 new cases (see above) |
| SortableHeader | New: `.../components/SortableHeader.test.tsx` | Renders label, shows arrow when active, calls onSort on click, toggles direction |
| ExportButton | New: `.../components/ExportButton.test.tsx` | Renders button, generates CSV blob, downloads with correct filename |
| FilterBar | New: `.../components/FilterBar.test.tsx` | Renders filter chips, remove calls onRemoveFilter, Clear All calls onClearAll, renders children |

---

### Data Flow Overview

```
User interacts (click sort header / type search / pick date / select action)
  → useTableState updates URL searchParams
  → useEffect triggers API call with current params
    → Server (app.ts): destructures query, builds orderBy/where, queries Prisma
    → Returns paginated + sorted + filtered data
  → Page component renders table with sorted data
  → ExportButton serializes current data to CSV on click
```

- **Servers**: All data loaded once; sorting, searching, filtering happen client-side
- **Users**: Server-side sort (via Prisma `orderBy`) and paginate; virtual "Warnings" count not sortable
- **Warnings**: Server-side sort + date range filter (via Prisma `where.createdAt`)
- **AuditLog**: Server-side sort + action type filter + date range filter

---

### Accepted Risks

| Risk | Mitigation |
|---|---|
| **useSearchParams paradigm shift** — all 4 list pages migrate from `useState` to URL-based state. If a future developer is unfamiliar with the pattern, they may misuse it. | Convention documented in the hook interface; all 4 pages follow the same pattern. URL-based state is the standard React Router pattern for bookmarkable views. |
| **Client-side sort on Servers** — sorting 100+ rows in browser is fast, but if server count grows to 10K+, client-side sort becomes slow. | Acceptable for current scale. Can be moved server-side later by adding `sortBy`/`sortOrder` to the `getServers` Prisma query (schema already has `name`, `guildId` columns available). |
| **Client-side filter on Servers** — same scaling concern as above. | Same mitigation: move to server-side query when needed. |
| **Invalid sortBy silently ignored** — user passes a bogus field name, falls back to default sort. No error feedback. | Acceptable UX trade-off; the URL is user-writable anyway. Invalid params produce valid results (just not sorted as expected). |
| **Debounce on search only** — filter dropdown changes and date picker changes apply immediately, which could cause rapid API calls. | Filter dropdowns have few options, date pickers require explicit selection. 300ms debounce on search is the critical one. |

---

### Case Record

**Original Request**: Developer needs sortable, filterable, exportable data tables across all 4 dashboard list pages (Servers, Users, Warnings, AuditLog) for debugging/monitoring.

**Key Decisions**:
- URL-based state via `useSearchParams` as single source of truth (bookmarkable, shareable)
- Servers: all client-side sorting/filtering (no pagination, all data loaded)
- Users/Warnings/AuditLog: server-side sorting via Prisma `orderBy`
- Dashboard mini-table: no changes (5 rows, no value in sorting)
- Debounce: 300ms on server-side search only
- Invalid sort fields: silently ignored with default sort fallback
- No DB migration needed

**Unresolved OBJECTIONS**: None. All 5 items from previous session resolved.
