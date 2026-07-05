import { Router } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET =
  process.env.DASHBOARD_JWT_SECRET || 'dashboard-secret-change-in-production';
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin';

router.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (username === 'admin' && password === DASHBOARD_PASSWORD) {
      const token = jwt.sign(
        { userId: 'admin', username: 'admin', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      res.json({
        token,
        user: { userId: 'admin', username: 'admin', role: 'admin' },
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials.' });
    }
  } catch {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
