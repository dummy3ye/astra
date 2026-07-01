import { describe, it, expect, vi, beforeEach } from 'vitest';
import { automodCommand } from '../automod';

const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();

vi.mock('../../../database/client', () => ({
  prisma: {
    serverSettings: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      upsert: (...args: any[]) => mockUpsert(...args),
    },
  },
}));

describe('automodCommand', () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockUpsert.mockReset();
  });

  it('has correct name', () => {
    expect(automodCommand.data.name).toBe('automod');
  });

  it('displays automod status when status subcommand is called', async () => {
    mockFindUnique.mockResolvedValue({
      guildId: 'guild-123',
      blockedWords: 'foo,bar',
      blockLinks: true,
    });

    const reply = vi.fn();
    const interaction = {
      guildId: 'guild-123',
      options: {
        getSubcommand: () => 'status',
      },
      reply,
    };

    await automodCommand.execute(interaction as any);

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { guildId: 'guild-123' },
    });
    expect(reply).toHaveBeenCalledOnce();
    const replyArg = reply.mock.calls[0][0];
    expect(replyArg.ephemeral).toBe(true);
    expect(replyArg.content).toContain('**Blocked Words**: foo,bar');
    expect(replyArg.content).toContain('**Link Blocking**: Enabled');
  });

  it('updates configuration when config subcommand is called', async () => {
    const reply = vi.fn();
    const interaction = {
      guildId: 'guild-123',
      options: {
        getSubcommand: () => 'config',
        getString: (name: string) => {
          if (name === 'blocked_words') return 'baz,qux';
          return null;
        },
        getBoolean: (name: string) => {
          if (name === 'block_links') return true;
          return null;
        },
      },
      reply,
    };

    await automodCommand.execute(interaction as any);

    expect(mockUpsert).toHaveBeenCalledWith({
      where: { guildId: 'guild-123' },
      update: {
        blockedWords: 'baz,qux',
        blockLinks: true,
      },
      create: {
        guildId: 'guild-123',
        blockedWords: 'baz,qux',
        blockLinks: true,
      },
    });
    expect(reply).toHaveBeenCalledWith({
      content: '✅ Auto-moderation settings updated successfully!',
      ephemeral: true,
    });
  });
});
