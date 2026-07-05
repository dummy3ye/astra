import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import helmet from 'helmet';
import { prisma } from './database/client';

const app = express();
const PORT = process.env.PORT || 3001;

// Environment variables
const JWT_SECRET = process.env.DASHBOARD_JWT_SECRET || 'dashboard-secret-change-in-production';
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Authentication middleware
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid token.' });
  }
};

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Simple auth (could be enhanced with database)
    if (username === 'admin' && password === DASHBOARD_PASSWORD) {
      const token = jwt.sign(
        { userId: 'admin', username: 'admin', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      res.json({ token, user: { userId: 'admin', username: 'admin', role: 'admin' } });
    } else {
      res.status(401).json({ error: 'Invalid credentials.' });
    }
  } catch {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get all stats
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const [
      totalUsers,
      totalServers,
      totalWarnings,
      activeAutomod,
      activeMembers,
      dailyWarnings
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
      })
    ]);

    const today = new Set(dailyWarnings.map(w => w.createdAt.toDateString())).size;

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

// Get all banned users
app.get('/api/bans', authenticateToken, async (req, res) => {
  try {
    const currentDate = new Date();
    const fifteenDaysAgo = new Date(currentDate.getTime() - 15 * 24 * 60 * 60 * 1000);

    const warnings = await prisma.warning.findMany({
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    const enrichedBans = warnings.map(warning => {
      const createdAt = new Date(warning.createdAt);
      const isRecent = createdAt > fifteenDaysAgo;
      const daysAgo = Math.floor((currentDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

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

// Get all servers
app.get('/api/servers', authenticateToken, async (req, res) => {
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

    const enrichedServers = servers.map(server => {
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

// Get all users
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        xp: 'desc',
      },
      take: 100,
    });

    const enrichedUsers = users.map(user => {
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

// Get audit logs
app.get('/api/audit-logs', authenticateToken, async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
      include: {
        // Include related models if needed
      },
    });

    res.json(logs);
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

// Get automod status
app.get('/api/automod', authenticateToken, async (req, res) => {
  try {
    const allServers = await prisma.serverSettings.findMany({
      select: {
        guildId: true,
        blockLinks: true,
        blockedWords: true,
      },
    });

    const automodStatus = allServers.map(server => {
      return {
        guildId: server.guildId,
        blockLinks: server.blockLinks,
        blockedWords: server.blockedWords ? server.blockedWords.split(',').filter(w => w.trim()) : [],
        lastChecked: new Date().toISOString(),
      };
    });

    res.json(automodStatus);
  } catch (error) {
    console.error('Automod status error:', error);
    res.status(500).json({ error: 'Failed to fetch automod status.' });
  }
});

// Admin action to clear old data
app.post('/api/admin/clear-old-warnings', authenticateToken, async (req, res) => {
  try {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

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
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error.',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found.',
    path: req.path,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Dashboard API running on port ${PORT}`);
});
