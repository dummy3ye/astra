import { Router } from 'express';
import { prisma } from '../database/client';
import { authenticateToken } from '../middleware';

const router = Router();

router.get('/api/bans', authenticateToken, async (req, res) => {
  try {
    const currentDate = new Date();
    const fifteenDaysAgo = new Date(
      currentDate.getTime() - 15 * 24 * 60 * 60 * 1000
    );

    const warnings = await prisma.warning.findMany({
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    const enrichedBans = warnings.map((warning) => {
      const createdAt = new Date(warning.createdAt);
      const isRecent = createdAt > fifteenDaysAgo;
      const daysAgo = Math.floor(
        (currentDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: warning.id,
        userId: warning.userId,
        guildId: warning.guildId,
        reason: warning.reason,
        createdAt: warning.createdAt,
        user: warning.user,
        daysAgo,
        isRecent,
      };
    });

    const total = await prisma.warning.count();

    res.json({
      bans: enrichedBans,
      total,
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: Math.ceil(total / 20),
      },
    });
  } catch (error) {
    console.error('Bans error:', error);
    res.status(500).json({ error: 'Failed to fetch bans.' });
  }
});

export default router;
