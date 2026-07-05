import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { createApp } from '../app';

function mockPrisma(): PrismaClient {
  return {
    user: {
      count: vi.fn().mockResolvedValue(42),
      findMany: vi.fn().mockResolvedValue([
        { id: 'u1', guildId: 'g1', xp: 1500, level: 5, warnings: [] },
      ]),
    },
    serverSettings: {
      count: vi.fn().mockResolvedValue(3),
      findMany: vi.fn().mockResolvedValue([
        { guildId: 'g1', blockLinks: true, blockedWords: 'bad', warnTimeoutThreshold: 3, warnBanThreshold: 5 },
      ]),
    },
    warning: {
      count: vi.fn().mockResolvedValue(10),
      findMany: vi.fn().mockResolvedValue([]),
    },
    auditLog: {
      count: vi.fn().mockResolvedValue(5),
      findMany: vi.fn().mockResolvedValue([]),
      groupBy: vi.fn().mockResolvedValue([
        { action: 'ban', _count: { action: 3 } },
        { action: 'kick', _count: { action: 2 } },
      ]),
    },
    levelRole: {
      count: vi.fn().mockResolvedValue(2),
    },
  } as unknown as PrismaClient;
}

describe('API routes', () => {
  it('GET /api/users?sortBy=xp&sortOrder=desc sorts by xp descending', async () => {
    const prisma = mockPrisma();
    const app = createApp({ prisma });
    const res = await request(app).get('/api/users?sortBy=xp&sortOrder=desc');
    expect(res.status).toBe(200);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { xp: 'desc' } }),
    );
  });

  it('GET /api/users?sortBy=invalidField uses default sort', async () => {
    const prisma = mockPrisma();
    const app = createApp({ prisma });
    const res = await request(app).get('/api/users?sortBy=invalidField');
    expect(res.status).toBe(200);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { xp: 'desc' } }),
    );
  });

  it('GET /api/warnings?startDate=2026-01-01&endDate=2026-06-30 filters by date range', async () => {
    const prisma = mockPrisma();
    (prisma.warning.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const app = createApp({ prisma });
    const res = await request(app).get('/api/warnings?startDate=2026-01-01&endDate=2026-06-30');
    expect(res.status).toBe(200);
    expect(prisma.warning.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });

  it('GET /api/audit-log?action=ban filters by action', async () => {
    const prisma = mockPrisma();
    (prisma.auditLog.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const app = createApp({ prisma });
    const res = await request(app).get('/api/audit-log?action=ban');
    expect(res.status).toBe(200);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ action: 'ban' }) }),
    );
  });

  it('GET /api/servers?sortBy=name&sortOrder=asc accepts sort params', async () => {
    const app = createApp({ prisma: mockPrisma() });
    const res = await request(app).get('/api/servers?sortBy=name&sortOrder=asc');
    expect(res.status).toBe(200);
  });
  it('GET /api/stats returns 200 with stats shape', async () => {
    const app = createApp({ prisma: mockPrisma() });
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalUsers', 42);
    expect(res.body).toHaveProperty('totalServers', 3);
    expect(res.body).toHaveProperty('totalWarnings', 10);
    expect(res.body).toHaveProperty('totalBans', 5);
    expect(res.body).toHaveProperty('recentWarnings');
    expect(res.body).toHaveProperty('auditActionBreakdown');
    expect(res.body).toHaveProperty('warningsByDay');
    expect(res.body.auditActionBreakdown).toHaveLength(2);
    expect(res.body.warningsByDay).toHaveLength(7);
  });

  it('GET /api/stats returns 500 on error', async () => {
    const prisma = mockPrisma();
    (prisma.user.count as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db error'));
    const app = createApp({ prisma });
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch stats' });
  });

  it('GET /api/servers returns 200 with server list', async () => {
    const app = createApp({ prisma: mockPrisma() });
    const res = await request(app).get('/api/servers');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('guildId');
    expect(res.body[0]).toHaveProperty('memberCount');
    expect(res.body[0]).toHaveProperty('warningCount');
    expect(res.body[0]).toHaveProperty('levelRoles');
  });

  it('GET /api/servers returns 500 on error', async () => {
    const prisma = mockPrisma();
    (prisma.serverSettings.findMany as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db error'));
    const app = createApp({ prisma });
    const res = await request(app).get('/api/servers');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch servers' });
  });

  it('GET /api/users returns 200 with paginated user list', async () => {
    const app = createApp({ prisma: mockPrisma() });
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total', 42);
    expect(res.body.items[0]).toHaveProperty('id', 'u1');
    expect(res.body.items[0]).toHaveProperty('xp', 1500);
    expect(res.body.items[0]).toHaveProperty('level', 5);
    expect(res.body.items[0]).toHaveProperty('warnings', 0);
  });

  it('GET /api/users returns 500 on error', async () => {
    const prisma = mockPrisma();
    (prisma.user.findMany as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db error'));
    const app = createApp({ prisma });
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch users' });
  });

  it('GET /api/warnings returns 200 with paginated warning list', async () => {
    const prisma = mockPrisma();
    (prisma.warning.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 1, userId: 'u1', guildId: 'g1', reason: 'spam',
        createdAt: new Date(),
        user: { level: 3, xp: 800 },
      },
    ]);
    const app = createApp({ prisma });
    const res = await request(app).get('/api/warnings');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total', 10);
    expect(res.body.items[0]).toHaveProperty('id', 1);
    expect(res.body.items[0]).toHaveProperty('userLevel', 3);
    expect(res.body.items[0]).toHaveProperty('userXp', 800);
  });

  it('GET /api/warnings returns 500 on error', async () => {
    const prisma = mockPrisma();
    (prisma.warning.findMany as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db error'));
    const app = createApp({ prisma });
    const res = await request(app).get('/api/warnings');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch warnings' });
  });

  it('GET /api/audit-log returns 200 with paginated audit entries', async () => {
    const prisma = mockPrisma();
    (prisma.auditLog.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 1, guildId: 'g1', action: 'ban', targetId: 'u1',
        reason: 'violation', createdAt: new Date(),
      },
    ]);
    const app = createApp({ prisma });
    const res = await request(app).get('/api/audit-log');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total', 5);
    expect(res.body.items[0]).toHaveProperty('id', 1);
    expect(res.body.items[0]).toHaveProperty('action', 'ban');
    expect(res.body.items[0]).toHaveProperty('targetId', 'u1');
  });

  it('GET /api/audit-log returns 500 on error', async () => {
    const prisma = mockPrisma();
    (prisma.auditLog.findMany as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db error'));
    const app = createApp({ prisma });
    const res = await request(app).get('/api/audit-log');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch audit log' });
  });
});
