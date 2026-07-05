import { PrismaClient } from '@prisma/client';
import { buildOrderBy, SORTABLE_WARNING_FIELDS } from './utils';

export function getWarningsHandler(prisma: PrismaClient) {
  return async ({ query }: { query: Record<string, string | undefined> }) => {
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
          skip: skip ? Number(skip) : undefined,
          take: take ? Number(take) : undefined,
          include: { user: true },
        }),
        prisma.warning.count({ where }),
      ]);
      return {
        status: 200 as const,
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
  };
}
