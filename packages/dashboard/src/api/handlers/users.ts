import { PrismaClient } from '@prisma/client';
import { buildOrderBy, SORTABLE_USER_FIELDS } from './utils';

export function getUsersHandler(prisma: PrismaClient) {
  return async ({ query }: { query: Record<string, string | undefined> }) => {
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
          skip: skip ? Number(skip) : undefined,
          take: take ? Number(take) : undefined,
          include: { warnings: true },
        }),
        prisma.user.count({ where }),
      ]);
      return {
        status: 200 as const,
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
  };
}
