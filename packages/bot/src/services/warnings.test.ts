import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUserUpsert = vi.fn();
const mockWarningCreate = vi.fn();
const mockWarningCount = vi.fn();
const mockWarningFindMany = vi.fn();
const mockWarningDeleteMany = vi.fn();

vi.mock('../database/client', () => ({
  prisma: {
    user: {
      upsert: mockUserUpsert,
    },
    warning: {
      create: mockWarningCreate,
      count: mockWarningCount,
      findMany: mockWarningFindMany,
      deleteMany: mockWarningDeleteMany,
    },
  },
}));

describe('warnings service', () => {
  beforeEach(() => {
    mockUserUpsert.mockReset();
    mockWarningCreate.mockReset();
    mockWarningCount.mockReset();
    mockWarningFindMany.mockReset();
    mockWarningDeleteMany.mockReset();
  });

  it('createWarning upserts user and creates warning', async () => {
    const { createWarning } = await import('./warnings');

    await createWarning({
      userId: 'user-1',
      guildId: 'guild-1',
      reason: 'rule break',
    });

    expect(mockUserUpsert).toHaveBeenCalledWith({
      where: { id_guildId: { id: 'user-1', guildId: 'guild-1' } },
      create: { id: 'user-1', guildId: 'guild-1' },
      update: {},
    });

    expect(mockWarningCreate).toHaveBeenCalledWith({
      data: { userId: 'user-1', guildId: 'guild-1', reason: 'rule break' },
    });
  });

  it('getWarningCount returns warning count for user', async () => {
    mockWarningCount.mockResolvedValue(3);
    const { getWarningCount } = await import('./warnings');

    const count = await getWarningCount('user-1', 'guild-1');

    expect(count).toBe(3);
    expect(mockWarningCount).toHaveBeenCalledWith({
      where: { userId: 'user-1', guildId: 'guild-1' },
    });
  });

  it('getUserWarnings returns warnings sorted by date', async () => {
    const mockWarnings = [
      {
        id: 2,
        userId: 'user-1',
        guildId: 'guild-1',
        reason: 'spam',
        createdAt: new Date(),
      },
      {
        id: 1,
        userId: 'user-1',
        guildId: 'guild-1',
        reason: 'bad word',
        createdAt: new Date(Date.now() - 1000),
      },
    ];
    mockWarningFindMany.mockResolvedValue(mockWarnings);
    const { getUserWarnings } = await import('./warnings');

    const warnings = await getUserWarnings('user-1', 'guild-1');

    expect(warnings).toEqual(mockWarnings);
    expect(mockWarningFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', guildId: 'guild-1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('deleteUserWarnings deletes warnings for user', async () => {
    const { deleteUserWarnings } = await import('./warnings');

    await deleteUserWarnings('user-1', 'guild-1');

    expect(mockWarningDeleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', guildId: 'guild-1' },
    });
  });
});
