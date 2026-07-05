import { PrismaClient } from '@prisma/client';
import { buildOrderBy, SORTABLE_AUDIT_FIELDS } from './utils';

export function getAuditLogHandler(prisma: PrismaClient) {
  return async ({ query }: { query: Record<string, string | undefined> }) => {
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
          skip: skip ? Number(skip) : undefined,
          take: take ? Number(take) : undefined,
        }),
        prisma.auditLog.count({ where }),
      ]);
      return {
        status: 200 as const,
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
  };
}
