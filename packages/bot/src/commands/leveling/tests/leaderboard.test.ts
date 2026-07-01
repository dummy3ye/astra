import { describe, it, expect, vi, beforeEach } from 'vitest';
import { leaderboardCommand } from '../leaderboard';

const mockFindMany = vi.fn();

vi.mock('../../../database/client', () => ({
  prisma: {
    user: {
      findMany: (...args: any[]) => mockFindMany(...args),
    },
  },
}));

describe('leaderboardCommand', () => {
  beforeEach(() => {
    mockFindMany.mockReset();
  });

  it('has correct name', () => {
    expect(leaderboardCommand.data.name).toBe('leaderboard');
  });

  it('replies with empty message when no users exist', async () => {
    mockFindMany.mockResolvedValue([]);
    const deferReply = vi.fn();
    const editReply = vi.fn();
    const interaction = {
      guildId: 'guild-123',
      deferReply,
      editReply,
    };

    await leaderboardCommand.execute(interaction as any);

    expect(deferReply).toHaveBeenCalled();
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { guildId: 'guild-123' },
      orderBy: [{ level: 'desc' }, { xp: 'desc' }],
      take: 10,
    });
    expect(editReply).toHaveBeenCalledWith({
      content: 'No users have earned any XP yet!',
    });
  });

  it('displays user rankings', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'user1', level: 5, xp: 120 },
      { id: 'user2', level: 3, xp: 80 },
    ]);

    const mockFetch = vi.fn().mockImplementation(async (id: string) => {
      return { username: `name_${id}` };
    });

    const deferReply = vi.fn();
    const editReply = vi.fn();
    const interaction = {
      guildId: 'guild-123',
      deferReply,
      editReply,
      client: {
        users: {
          fetch: mockFetch,
        },
      },
    };

    await leaderboardCommand.execute(interaction as any);

    expect(deferReply).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('1. **name_user1** - Level 5'),
    });
    expect(editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('2. **name_user2** - Level 3'),
    });
  });
});
