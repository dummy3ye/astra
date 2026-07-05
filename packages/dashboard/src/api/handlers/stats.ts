import { PrismaClient } from '@prisma/client';

export function getStatsHandler(prisma: PrismaClient) {
  return async () => {
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
        status: 200 as const,
        body: {
          totalUsers,
          totalServers,
          totalWarnings,
          totalBans,
          recentWarnings: last5.map((w) => ({
            id: w.id,
            userId: w.userId,
            userName: (w as never as { user: { username: string } }).user?.username ?? null,
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
  };
}
