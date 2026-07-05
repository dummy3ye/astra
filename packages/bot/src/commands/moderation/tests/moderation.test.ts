import { describe, it, expect, vi, beforeEach } from 'vitest';
import { unbanCommand } from '../unban';
import { timeoutCommand } from '../timeout';
import { untimeoutCommand } from '../untimeout';
import { warningsCommand } from '../warnings';
import { clearwarnsCommand } from '../clearwarns';
import { AuditActions } from '@astra/shared';

const { mockLogAudit, mockGetUserWarnings, mockDeleteUserWarnings } =
  vi.hoisted(() => ({
    mockLogAudit: vi.fn(),
    mockGetUserWarnings: vi.fn(),
    mockDeleteUserWarnings: vi.fn(),
  }));

vi.mock('../../../services/auditLog', () => ({
  logAudit: mockLogAudit,
}));

vi.mock('../../../services/warnings', () => ({
  getUserWarnings: mockGetUserWarnings,
  deleteUserWarnings: mockDeleteUserWarnings,
}));

describe('Moderation Commands', () => {
  beforeEach(() => {
    mockLogAudit.mockReset();
    mockGetUserWarnings.mockReset();
    mockDeleteUserWarnings.mockReset();
  });

  describe('unbanCommand', () => {
    it('has the correct name', () => {
      expect(unbanCommand.data.name).toBe('unban');
    });

    it('unbans a user and logs audit on success', async () => {
      const mockUnban = vi.fn().mockResolvedValue(true);
      const reply = vi.fn();
      const interaction = {
        options: {
          getString: (name: string) => {
            if (name === 'user_id') return '12345';
            if (name === 'reason') return 'appeal approved';
            return null;
          },
        },
        guild: {
          id: 'guild-123',
          members: {
            unban: mockUnban,
          },
        },
        reply,
      };

      await unbanCommand.execute(interaction as never);

      expect(mockUnban).toHaveBeenCalledWith('12345', 'appeal approved');
      expect(mockLogAudit).toHaveBeenCalledWith({
        guildId: 'guild-123',
        action: AuditActions.UNBAN,
        targetId: '12345',
        reason: 'appeal approved',
      });
      expect(reply).toHaveBeenCalledWith({
        content: 'Unbanned user ID 12345. Reason: appeal approved',
        ephemeral: true,
      });
    });

    it('replies with error message if unban fails', async () => {
      const mockUnban = vi
        .fn()
        .mockRejectedValue(new Error('Discord API Error'));
      const reply = vi.fn();
      const interaction = {
        options: {
          getString: (name: string) => {
            if (name === 'user_id') return '12345';
            return null;
          },
        },
        guild: {
          id: 'guild-123',
          members: {
            unban: mockUnban,
          },
        },
        reply,
      };

      await unbanCommand.execute(interaction as never);

      expect(mockUnban).toHaveBeenCalled();
      expect(mockLogAudit).not.toHaveBeenCalled();
      expect(reply).toHaveBeenCalledWith({
        content:
          'Failed to unban user ID 12345. Make sure the ID is correct and they are currently banned.',
        ephemeral: true,
      });
    });
  });

  describe('timeoutCommand', () => {
    it('has the correct name', () => {
      expect(timeoutCommand.data.name).toBe('timeout');
    });

    it('times out a user and logs audit on success', async () => {
      const mockTimeout = vi.fn().mockResolvedValue(true);
      const highRole = { position: 10 };
      const lowRole = { position: 1 };
      const mockModeratorMember = {
        id: 'mod-111',
        roles: { highest: highRole },
      };
      const mockTargetMember = {
        id: '555',
        user: { tag: 'user#555' },
        roles: { highest: lowRole },
        timeout: mockTimeout,
      };
      const mockFetchMember = vi
        .fn()
        .mockImplementation((id: string) =>
          id === 'mod-111'
            ? Promise.resolve(mockModeratorMember)
            : Promise.resolve(mockTargetMember)
        );
      const reply = vi.fn();
      const interaction = {
        user: { id: 'mod-111' },
        options: {
          getUser: () => ({ id: '555', tag: 'user#555' }),
          getInteger: () => 300000,
          getString: () => 'spamming',
        },
        guild: {
          id: 'guild-123',
          ownerId: 'owner-999',
          members: {
            fetch: mockFetchMember,
            me: { roles: { highest: { position: 20 } } },
          },
        },
        reply,
      };

      await timeoutCommand.execute(interaction as never);

      expect(mockFetchMember).toHaveBeenCalledWith('555');
      expect(mockTimeout).toHaveBeenCalledWith(300000, 'spamming');
      expect(mockLogAudit).toHaveBeenCalledWith({
        guildId: 'guild-123',
        action: AuditActions.TIMEOUT,
        targetId: '555',
        reason: 'spamming (Duration: 300s)',
      });
      expect(reply).toHaveBeenCalledWith({
        content: 'Timed out user#555 for 300s. Reason: spamming',
        ephemeral: true,
      });
    });
  });

  describe('untimeoutCommand', () => {
    it('has the correct name', () => {
      expect(untimeoutCommand.data.name).toBe('untimeout');
    });

    it('removes timeout and logs audit on success', async () => {
      const mockTimeout = vi.fn().mockResolvedValue(true);
      const mockFetchMember = vi.fn().mockResolvedValue({
        timeout: mockTimeout,
      });
      const reply = vi.fn();
      const interaction = {
        options: {
          getUser: () => ({ id: '555', tag: 'user#555' }),
          getString: () => 'behaved well',
        },
        guild: {
          id: 'guild-123',
          members: {
            fetch: mockFetchMember,
          },
        },
        reply,
      };

      await untimeoutCommand.execute(interaction as never);

      expect(mockFetchMember).toHaveBeenCalledWith('555');
      expect(mockTimeout).toHaveBeenCalledWith(null, 'behaved well');
      expect(mockLogAudit).toHaveBeenCalledWith({
        guildId: 'guild-123',
        action: AuditActions.UNTIMEOUT,
        targetId: '555',
        reason: 'behaved well',
      });
      expect(reply).toHaveBeenCalledWith({
        content: 'Removed timeout from user#555. Reason: behaved well',
        ephemeral: true,
      });
    });
  });

  describe('warningsCommand', () => {
    it('has the correct name', () => {
      expect(warningsCommand.data.name).toBe('warnings');
    });

    it('allows a user to view their own warnings without moderation permission', async () => {
      const reply = vi.fn();
      const mockWarnings = [
        {
          id: 1,
          userId: '111',
          guildId: 'guild-123',
          reason: 'bad word',
          createdAt: new Date('2026-06-30T10:00:00Z'),
        },
      ];
      mockGetUserWarnings.mockResolvedValue(mockWarnings);

      const interaction = {
        user: { id: '111', tag: 'user#111' },
        options: {
          getUser: () => null, // defaults to self
        },
        guild: {
          id: 'guild-123',
        },
        reply,
      };

      await warningsCommand.execute(interaction as never);

      expect(mockGetUserWarnings).toHaveBeenCalledWith('111', 'guild-123');
      expect(reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Warnings for user#111 (1 total):'),
          ephemeral: true,
        })
      );
    });

    it("prevents viewing other users' warnings without ModerateMembers permission", async () => {
      const reply = vi.fn();
      const interaction = {
        user: { id: '111', tag: 'user#111' },
        options: {
          getUser: () => ({ id: '222', tag: 'user#222' }),
        },
        guild: {
          id: 'guild-123',
        },
        memberPermissions: {
          has: vi.fn().mockReturnValue(false), // has no ModerateMembers permission
        },
        reply,
      };

      await warningsCommand.execute(interaction as never);

      expect(mockGetUserWarnings).not.toHaveBeenCalled();
      expect(reply).toHaveBeenCalledWith({
        content: "You do not have permission to view other users' warnings.",
        ephemeral: true,
      });
    });

    it("allows checking other users' warnings with ModerateMembers permission", async () => {
      const reply = vi.fn();
      mockGetUserWarnings.mockResolvedValue([]);
      const interaction = {
        user: { id: '111', tag: 'user#111' },
        options: {
          getUser: () => ({ id: '222', tag: 'user#222' }),
        },
        guild: {
          id: 'guild-123',
        },
        memberPermissions: {
          has: vi.fn().mockReturnValue(true), // has permission
        },
        reply,
      };

      await warningsCommand.execute(interaction as never);

      expect(mockGetUserWarnings).toHaveBeenCalledWith('222', 'guild-123');
      expect(reply).toHaveBeenCalledWith({
        content: 'user#222 has no warnings.',
        ephemeral: true,
      });
    });
  });

  describe('clearwarnsCommand', () => {
    it('has the correct name', () => {
      expect(clearwarnsCommand.data.name).toBe('clearwarns');
    });

    it('clears warnings and logs audit', async () => {
      const reply = vi.fn();
      const interaction = {
        options: {
          getUser: () => ({ id: '222', tag: 'user#222' }),
        },
        guild: {
          id: 'guild-123',
        },
        reply,
      };

      await clearwarnsCommand.execute(interaction as never);

      expect(mockDeleteUserWarnings).toHaveBeenCalledWith('222', 'guild-123');
      expect(mockLogAudit).toHaveBeenCalledWith({
        guildId: 'guild-123',
        action: AuditActions.CLEAR_WARNINGS,
        targetId: '222',
      });
      expect(reply).toHaveBeenCalledWith({
        content: 'Cleared all warnings for user#222.',
        ephemeral: true,
      });
    });
  });
});
