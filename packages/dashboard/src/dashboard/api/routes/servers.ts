import { Router } from 'express';
import { prisma } from '../database/client';
import { authenticateToken } from '../middleware';

const router = Router();

router.get('/api/servers', authenticateToken, async (req, res) => {
  try {
    const servers = await prisma.serverSettings.findMany({
      select: {
        guildId: true,
        prefix: true,
        logChannelId: true,
        welcomeChannelId: true,
        blockLinks: true,
        blockedWords: true,
        warnTimeoutThreshold: true,
        warnBanThreshold: true,
      },
      orderBy: {
        guildId: 'asc',
      },
    });

    const enrichedServers = servers.map((server) => {
      return {
        guildId: server.guildId,
        prefix: server.prefix,
        channels: {
          log: server.logChannelId,
          welcome: server.welcomeChannelId,
        },
        automod: {
          blockLinks: server.blockLinks,
          blockedWords: server.blockedWords,
        },
        warnLimits: {
          timeoutAt: server.warnTimeoutThreshold || 0,
          banAt: server.warnBanThreshold || 0,
        },
      };
    });

    res.json(enrichedServers);
  } catch (error) {
    console.error('Servers error:', error);
    res.status(500).json({ error: 'Failed to fetch servers.' });
  }
});

export default router;
