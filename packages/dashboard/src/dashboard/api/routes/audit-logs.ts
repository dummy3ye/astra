import { Router } from 'express';
import { prisma } from '../database/client';
import { authenticateToken } from '../middleware';

const router = Router();

router.get('/api/audit-logs', authenticateToken, async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
      include: {},
    });

    res.json(logs);
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

export default router;
