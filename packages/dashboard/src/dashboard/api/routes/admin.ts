import { Router } from 'express';
import { prisma } from '../database/client';
import { authenticateToken } from '../middleware';

const router = Router();

router.post(
  '/api/admin/clear-old-warnings',
  authenticateToken,
  async (req, res) => {
    try {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = await prisma.warning.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      res.json({
        message: `Deleted ${result.count} old warnings.`,
        deletedCount: result.count,
      });
    } catch (error) {
      console.error('Clear old warnings error:', error);
      res.status(500).json({ error: 'Failed to clear old warnings.' });
    }
  }
);

export default router;
