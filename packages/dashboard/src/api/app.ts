import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createExpressEndpoints, initServer } from '@ts-rest/express';
import { contract } from '@astra/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(opts?: {
  databaseUrl?: string;
  prisma?: PrismaClient;
}) {
  const app = express();

  const url =
    opts?.databaseUrl ?? process.env.DATABASE_URL ?? 'file:../bot/dev.db';
  const prisma =
    opts?.prisma ?? new PrismaClient({ adapter: new PrismaLibSql({ url }) });

  app.use(cors());
  app.use(express.json());

  const dist = path.join(__dirname, '../web');
  app.use(express.static(dist));

  const SORTABLE_USER_FIELDS = [
    'id',
    'guildId',
    'xp',
    'level',
    'username',
    'displayName',
  ];
  const SORTABLE_WARNING_FIELDS = [
    'id',
    'userId',
    'guildId',
    'reason',
    'createdAt',
  ];
  const SORTABLE_AUDIT_FIELDS = [
    'id',
    'guildId',
    'action',
    'targetId',
    'targetName',
    'moderatorId',
    'moderatorName',
    'reason',
    'createdAt',
  ];

  function buildOrderBy(
    sortBy: string | undefined,
    sortOrder: string | undefined,
    allowed: string[]
  ) {
    return sortBy && allowed.includes(sortBy)
      ? { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' }
      : undefined;
  }

  const s = initServer();

  const router = s.router(contract, {
    getStats: async () => {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [
          totalUsers,
          totalServers,
          totalWarnings,
          totalBans,
          last5,
          chartWarnings,
          auditActions,
        ] = await Promise.all([
          prisma.user.count(),
          prisma.serverSettings.count(),
          prisma.warning.count(),
          prisma.auditLog.count({ where: { action: 'ban' } }),
          prisma.warning.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { user: true },
          }),
          prisma.warning.findMany({
            where: { createdAt: { gte: sevenDaysAgo } },
            select: { createdAt: true },
          }),
          prisma.auditLog.groupBy({ by: ['action'], _count: { action: true } }),
        ]);

        const warningsByDayMap = new Map<string, number>();
        for (const w of chartWarnings) {
          const key = w.createdAt.toISOString().slice(0, 10);
          warningsByDayMap.set(key, (warningsByDayMap.get(key) ?? 0) + 1);
        }

        const days: { date: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          days.push({ date: key, count: warningsByDayMap.get(key) ?? 0 });
        }

        return {
          status: 200,
          body: {
            totalUsers,
            totalServers,
            totalWarnings,
            totalBans,
            recentWarnings: last5.map((w) => ({
              id: w.id,
              userId: w.userId,
              userName: (w as any).user?.username ?? null,
              reason: w.reason,
              createdAt: w.createdAt.toISOString(),
            })),
            auditActionBreakdown: auditActions.map((a) => ({
              action: a.action,
              count: a._count.action,
            })),
            warningsByDay: days,
          },
        };
      } catch {
        return {
          status: 500 as const,
          body: { error: 'Failed to fetch stats' },
        };
      }
    },
    getServers: async () => {
      try {
        const servers = await prisma.serverSettings.findMany();
        const enriched = await Promise.all(
          servers.map(async (s) => ({
            guildId: s.guildId,
            name: s.name,
            icon: s.icon,
            memberCount: await prisma.user.count({
              where: { guildId: s.guildId },
            }),
            warningCount: await prisma.warning.count({
              where: { guildId: s.guildId },
            }),
            blockLinks: s.blockLinks,
            blockedWords: s.blockedWords,
            warnTimeoutThreshold: s.warnTimeoutThreshold,
            warnBanThreshold: s.warnBanThreshold,
            levelRoles: await prisma.levelRole.count({
              where: { guildId: s.guildId },
            }),
          }))
        );
        return { status: 200, body: enriched };
      } catch {
        return {
          status: 500 as const,
          body: { error: 'Failed to fetch servers' },
        };
      }
    },
    getUsers: async ({ query }) => {
      try {
        const { skip, take, q, sortBy, sortOrder } = query;
        const where = q
          ? { OR: [{ id: { contains: q } }, { guildId: { contains: q } }] }
          : undefined;
        const orderBy = buildOrderBy(
          sortBy,
          sortOrder,
          SORTABLE_USER_FIELDS
        ) ?? { xp: 'desc' };
        const [users, total] = await Promise.all([
          prisma.user.findMany({
            where,
            orderBy,
            skip,
            take,
            include: { warnings: true },
          }),
          prisma.user.count({ where }),
        ]);
        return {
          status: 200,
          body: {
            items: users.map((u) => ({
              id: u.id,
              guildId: u.guildId,
              xp: u.xp,
              level: u.level,
              warnings: u.warnings.length,
              username: u.username,
              displayName: u.displayName,
              avatar: u.avatar,
            })),
            total,
          },
        };
      } catch {
        return {
          status: 500 as const,
          body: { error: 'Failed to fetch users' },
        };
      }
    },
    getWarnings: async ({ query }) => {
      try {
        const { skip, take, q, sortBy, sortOrder, startDate, endDate } = query;
        const where: Record<string, unknown> = {
          ...(q
            ? {
                OR: [
                  { userId: { contains: q } },
                  { reason: { contains: q } },
                  { guildId: { contains: q } },
                ],
              }
            : {}),
          ...(startDate || endDate
            ? {
                createdAt: {
                  ...(startDate ? { gte: new Date(startDate) } : {}),
                  ...(endDate ? { lte: new Date(endDate) } : {}),
                },
              }
            : {}),
        };
        const orderBy = buildOrderBy(
          sortBy,
          sortOrder,
          SORTABLE_WARNING_FIELDS
        ) ?? { createdAt: 'desc' };
        const [warnings, total] = await Promise.all([
          prisma.warning.findMany({
            where,
            orderBy,
            skip,
            take,
            include: { user: true },
          }),
          prisma.warning.count({ where }),
        ]);
        return {
          status: 200,
          body: {
            items: warnings.map((w) => ({
              id: w.id,
              userId: w.userId,
              guildId: w.guildId,
              reason: w.reason,
              createdAt: w.createdAt.toISOString(),
              userLevel: w.user.level,
              userXp: w.user.xp,
              userName: w.user.username,
              userDisplayName: w.user.displayName,
              userAvatar: w.user.avatar,
            })),
            total,
          },
        };
      } catch {
        return {
          status: 500 as const,
          body: { error: 'Failed to fetch warnings' },
        };
      }
    },
    getAuditLog: async ({ query }) => {
      try {
        const { skip, take, q, sortBy, sortOrder, startDate, endDate, action } =
          query;
        const where: Record<string, unknown> = {
          ...(q
            ? {
                OR: [
                  { targetId: { contains: q } },
                  { action: { contains: q } },
                  { guildId: { contains: q } },
                  { reason: { contains: q } },
                ],
              }
            : {}),
          ...(action ? { action } : {}),
          ...(startDate || endDate
            ? {
                createdAt: {
                  ...(startDate ? { gte: new Date(startDate) } : {}),
                  ...(endDate ? { lte: new Date(endDate) } : {}),
                },
              }
            : {}),
        };
        const orderBy = buildOrderBy(
          sortBy,
          sortOrder,
          SORTABLE_AUDIT_FIELDS
        ) ?? { createdAt: 'desc' };
        const [logs, total] = await Promise.all([
          prisma.auditLog.findMany({
            where,
            orderBy,
            skip,
            take,
          }),
          prisma.auditLog.count({ where }),
        ]);
        return {
          status: 200,
          body: {
            items: logs.map((l) => ({
              id: l.id,
              guildId: l.guildId,
              action: l.action,
              targetId: l.targetId,
              targetName: l.targetName,
              moderatorId: l.moderatorId,
              moderatorName: l.moderatorName,
              reason: l.reason,
              createdAt: l.createdAt.toISOString(),
            })),
            total,
          },
        };
      } catch {
        return {
          status: 500 as const,
          body: { error: 'Failed to fetch audit log' },
        };
      }
    },
  });

  createExpressEndpoints(contract, router, app);

  app.get('*', (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'));
  });

  return app;
}
