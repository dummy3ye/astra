import { describe, it, expect, vi, beforeEach } from 'vitest';
import { settingsCommand } from '../settings';

const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();
const mockDeleteMany = vi.fn();
const mockLevelRoleUpsert = vi.fn();
const mockLevelRoleDeleteMany = vi.fn();

vi.mock('../../../database/client', () => ({
  prisma: {
    serverSettings: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      upsert: (...args: any[]) => mockUpsert(...args),
    },
    levelRole: {
      upsert: (...args: any[]) => mockLevelRoleUpsert(...args),
      deleteMany: (...args: any[]) => mockLevelRoleDeleteMany(...args),
    },
  },
}));

describe('settingsCommand', () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockUpsert.mockReset();
    mockDeleteMany.mockReset();
    mockLevelRoleUpsert.mockReset();
    mockLevelRoleDeleteMany.mockReset();
  });

  it('has the correct name', () => {
    expect(settingsCommand.data.name).toBe('settings');
  });

  describe('status subcommand', () => {
    it('shows current server settings', async () => {
      mockFindUnique.mockResolvedValue({
        guildId: 'guild-1',
        logChannelId: 'chan-log',
        welcomeChannelId: null,
        blockLinks: true,
        blockedWords: 'foo,bar',
        warnTimeoutThreshold: 3,
        warnBanThreshold: 5,
        levelRoles: [{ level: 5, roleId: 'role-5' }],
      });

      const reply = vi.fn();
      const interaction = {
        guildId: 'guild-1',
        options: { getSubcommand: () => 'status' },
        reply,
      };

      await settingsCommand.execute(interaction as any);

      expect(reply).toHaveBeenCalledOnce();
      const arg = reply.mock.calls[0][0];
      expect(arg.ephemeral).toBe(true);
      expect(arg.embeds).toHaveLength(1);
    });

    it('handles no settings row gracefully', async () => {
      mockFindUnique.mockResolvedValue(null);

      const reply = vi.fn();
      const interaction = {
        guildId: 'guild-1',
        options: { getSubcommand: () => 'status' },
        reply,
      };

      await settingsCommand.execute(interaction as any);

      expect(reply).toHaveBeenCalledOnce();
    });
  });

  describe('channels subcommand', () => {
    it('updates log and welcome channels', async () => {
      const reply = vi.fn();
      const interaction = {
        guildId: 'guild-1',
        options: {
          getSubcommand: () => 'channels',
          getChannel: (name: string) => {
            if (name === 'log_channel') return { id: 'chan-log' };
            if (name === 'welcome_channel') return { id: 'chan-welcome' };
            return null;
          },
        },
        reply,
      };

      await settingsCommand.execute(interaction as any);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { guildId: 'guild-1' },
          update: expect.objectContaining({ logChannelId: 'chan-log' }),
        })
      );
      expect(reply).toHaveBeenCalledWith(
        expect.objectContaining({ ephemeral: true })
      );
    });

    it('replies with error if no channel provided', async () => {
      const reply = vi.fn();
      const interaction = {
        guildId: 'guild-1',
        options: {
          getSubcommand: () => 'channels',
          getChannel: () => null,
        },
        reply,
      };

      await settingsCommand.execute(interaction as any);

      expect(mockUpsert).not.toHaveBeenCalled();
      expect(reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('at least one channel'),
        })
      );
    });
  });

  describe('warn-escalation subcommand', () => {
    it('sets timeout and ban thresholds', async () => {
      const reply = vi.fn();
      const interaction = {
        guildId: 'guild-1',
        options: {
          getSubcommand: () => 'warn-escalation',
          getInteger: (name: string) =>
            name === 'timeout_at' ? 3 : name === 'ban_at' ? 5 : null,
        },
        reply,
      };

      await settingsCommand.execute(interaction as any);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { warnTimeoutThreshold: 3, warnBanThreshold: 5 },
        })
      );
      expect(reply).toHaveBeenCalledWith(
        expect.objectContaining({ ephemeral: true })
      );
    });

    it('disables thresholds when set to 0', async () => {
      const reply = vi.fn();
      const interaction = {
        guildId: 'guild-1',
        options: {
          getSubcommand: () => 'warn-escalation',
          getInteger: (name: string) => (name === 'timeout_at' ? 0 : null),
        },
        reply,
      };

      await settingsCommand.execute(interaction as any);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { warnTimeoutThreshold: null },
        })
      );
    });
  });

  describe('level-role subcommand', () => {
    it('sets a role reward for a given level', async () => {
      const reply = vi.fn();
      const interaction = {
        guildId: 'guild-1',
        options: {
          getSubcommand: () => 'level-role',
          getInteger: () => 5,
          getRole: () => ({ id: 'role-abc' }),
        },
        reply,
      };

      await settingsCommand.execute(interaction as any);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { guildId: 'guild-1' } })
      );
      expect(mockLevelRoleUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { guildId_level: { guildId: 'guild-1', level: 5 } },
          create: { guildId: 'guild-1', level: 5, roleId: 'role-abc' },
        })
      );
      expect(reply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('Level 5') })
      );
    });

    it('removes a level role when no role is provided', async () => {
      const reply = vi.fn();
      const interaction = {
        guildId: 'guild-1',
        options: {
          getSubcommand: () => 'level-role',
          getInteger: () => 5,
          getRole: () => null,
        },
        reply,
      };

      await settingsCommand.execute(interaction as any);

      expect(mockLevelRoleDeleteMany).toHaveBeenCalledWith({
        where: { guildId: 'guild-1', level: 5 },
      });
      expect(reply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('Removed') })
      );
    });
  });
});
