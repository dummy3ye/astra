import { PrismaClient } from '@prisma/client';

export function getServersHandler(prisma: PrismaClient) {
  return async () => {
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
      return { status: 200 as const, body: enriched };
    } catch {
      return {
        status: 500 as const,
        body: { error: 'Failed to fetch servers' },
      };
    }
  };
}
