import { Router } from 'express';
import { prisma } from '../database/client';
import { authenticateToken } from '../middleware';

const router = Router();

router.get('/api/automod', authenticateToken, async (req, res) => {
  try {
    const allServers = await prisma.serverSettings.findMany({
      select: {
        guildId: true,
        blockLinks: true,
        blockedWords: true,
      },
    });

    const automodStatus = allServers.map((server) => {
      return {
        guildId: server.guildId,
        blockLinks: server.blockLinks,
        blockedWords: server.blockedWords
          ? server.blockedWords.split(',').filter((w) => w.trim())
          : [],
        lastChecked: new Date().toISOString(),
      };
    });

    res.json(automodStatus);
  } catch (error) {
    console.error('Automod status error:', error);
    res.status(500).json({ error: 'Failed to fetch automod status.' });
  }
});

export default router;
