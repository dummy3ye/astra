import { Router } from 'express';
import { prisma } from '../database/client';
import { authenticateToken } from '../middleware';

const router = Router();

router.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const [
      totalUsers,
      totalServers,
      totalWarnings,
      activeAutomod,
      activeMembers,
      dailyWarnings,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.serverSettings.count(),
      prisma.warning.count(),
      prisma.serverSettings.count({ where: { blockLinks: true } }),
      prisma.user.count({ where: { xp: { gt: 0 } } }),
      prisma.warning.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        select: { createdAt: true },
      }),
    ]);

    const today = new Set(dailyWarnings.map((w) => w.createdAt.toDateString()))
      .size;

    res.json({
      totalUsers,
      totalServers,
      totalWarnings,
      activeAutomod,
      activeMembers,
      dailyWarnings: today,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

export default router;
