import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rankCommand } from '../rank';

const mockFindUnique = vi.fn();

vi.mock('../../../database/client', () => ({
  prisma: {
    user: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
    },
  },
}));

describe('rankCommand', () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
  });

  it('has the correct name', () => {
    expect(rankCommand.data.name).toBe('rank');
  });

  it('displays rank for a user with XP and progress bar', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'user-123',
      guildId: 'guild-abc',
      xp: 45,
      level: 2,
    });

    const reply = vi.fn();
    const interaction = {
      guildId: 'guild-abc',
      user: { id: 'user-123', username: 'caller' },
      options: {
        getUser: (name: string) => {
          if (name === 'user') return { id: 'user-123', username: 'caller' };
          return null;
        },
      },
      reply,
    };

    await rankCommand.execute(interaction as any);

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        id_guildId: {
          id: 'user-123',
          guildId: 'guild-abc',
        },
      },
    });

    expect(reply).toHaveBeenCalledOnce();
    const content = reply.mock.calls[0][0].content;
    expect(content).toContain('Rank for caller');
    expect(content).toContain('**Level**: 2');
    expect(content).toContain('**XP**: 45 / 200 XP');
    expect(content).toContain('Progress: `██░░░░░░░░` (22%)');
  });

  it('defaults to level 1, 0 XP if user not in db', async () => {
    mockFindUnique.mockResolvedValue(null);

    const reply = vi.fn();
const interaction = {
      guildId: 'guild-abc',
      user: { id: 'user-123', username: 'caller' },
      options: {
        getUser: () => null,
      },
      reply,
    };

    await rankCommand.execute(interaction as any);

    expect(reply).toHaveBeenCalledOnce();
    const content = reply.mock.calls[0][0].content;
    expect(content).toContain('**Level**: 1');
    expect(content).toContain('**XP**: 0 / 100 XP');
    expect(content).toContain('Progress: `░░░░░░░░░░` (0%)');
  });
});
