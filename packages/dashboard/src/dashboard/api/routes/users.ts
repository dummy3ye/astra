import { Router } from 'express';
import { prisma } from '../database/client';
import { authenticateToken } from '../middleware';

const router = Router();

router.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        xp: 'desc',
      },
      take: 100,
    });

    const enrichedUsers = users.map((user) => {
      const level = Math.floor(Math.sqrt(user.xp / 100)) + 1;
      const nextLevelXp = level * 100;
      const xpForNextLevel = Math.max(0, nextLevelXp - user.xp);

      return {
        id: user.id,
        guildId: user.guildId,
        xp: user.xp,
        level,
        nextLevelXp,
        xpToNextLevel: xpForNextLevel,
        createdAt: user.xp > 0 ? new Date().toISOString() : null,
      };
    });

    const total = await prisma.user.count();

    res.json({
      users: enrichedUsers,
      total,
      pagination: {
        page: 1,
        pageSize: 50,
        totalPages: Math.ceil(total / 50),
      },
    });
  } catch (error) {
    console.error('Users error:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

export default router;
