import { describe, it, expect, vi, beforeEach } from 'vitest';
import messageCreateEvent from '../messageCreate';
import { AuditActions } from '@astra/shared';

const mockFindUniqueSettings = vi.fn();
const mockUserUpsert = vi.fn();
const mockUserUpdate = vi.fn();
const mockWarningCreate = vi.fn();
const mockLogAudit = vi.fn();

vi.mock('../../../database/client', () => ({
  prisma: {
    serverSettings: {
      findUnique: (...args: any[]) => mockFindUniqueSettings(...args),
    },
    user: {
      upsert: (...args: any[]) => mockUserUpsert(...args),
      update: (...args: any[]) => mockUserUpdate(...args),
    },
    warning: {
      create: (...args: any[]) => mockWarningCreate(...args),
    },
  },
}));

vi.mock('../../../services/auditLog', () => ({
  logAudit: (...args: any[]) => mockLogAudit(...args),
}));

describe('messageCreate event', () => {
  beforeEach(() => {
    mockFindUniqueSettings.mockReset();
    mockUserUpsert.mockReset();
    mockUserUpdate.mockReset();
    mockWarningCreate.mockReset();
    mockLogAudit.mockReset();
  });

  it('ignores bot messages', async () => {
    const message = {
      author: { bot: true },
      guild: {},
      guildId: 'guild-123',
    };

    await messageCreateEvent.execute(message as any);

    expect(mockFindUniqueSettings).not.toHaveBeenCalled();
  });

  it('ignores messages outside guilds', async () => {
    const message = {
      author: { bot: false },
      guild: null,
      guildId: null,
    };

    await messageCreateEvent.execute(message as any);

    expect(mockFindUniqueSettings).not.toHaveBeenCalled();
  });

  it('bypasses automod for administrators/moderators', async () => {
    mockFindUniqueSettings.mockResolvedValue({
      guildId: 'guild-123',
      blockLinks: true,
      blockedWords: 'badword',
    });

    mockUserUpsert.mockResolvedValue({
      id: 'user-admin',
      guildId: 'guild-123',
      xp: 0,
      level: 1,
    });

    const hasPermission = vi.fn().mockReturnValue(true); // Has ManageMessages/Admin
    const message = {
      author: { bot: false, id: 'user-admin' },
      guild: {},
      guildId: 'guild-123',
      content: 'Hello look at https://google.com with badword',
      member: {
        permissions: {
          has: hasPermission,
        },
      },
      delete: vi.fn(),
    };

    await messageCreateEvent.execute(message as any);

    // Should NOT delete message
    expect(message.delete).not.toHaveBeenCalled();
    // Should process XP (upsert user)
    expect(mockUserUpsert).toHaveBeenCalled();
  });

  it('blocks links and warns user if blockLinks is enabled', async () => {
    mockFindUniqueSettings.mockResolvedValue({
      guildId: 'guild-123',
      blockLinks: true,
    });

    const hasPermission = vi.fn().mockReturnValue(false);
    const deleteMessage = vi.fn().mockResolvedValue({});
    const channelSend = vi.fn().mockResolvedValue({
      delete: vi.fn(),
    });

    const message = {
      author: { bot: false, id: 'user-link' },
      guild: {},
      guildId: 'guild-123',
      content: 'check this out: www.google.com',
      member: {
        permissions: {
          has: hasPermission,
        },
      },
      delete: deleteMessage,
      channel: {
        send: channelSend,
      },
    };

    await messageCreateEvent.execute(message as any);

    expect(deleteMessage).toHaveBeenCalled();
    expect(channelSend).toHaveBeenCalledWith(
      expect.stringContaining('posting links is not allowed')
    );
    expect(mockWarningCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-link',
        guildId: 'guild-123',
        reason: 'Automod: Posted link',
      },
    });
    expect(mockLogAudit).toHaveBeenCalledWith({
      guildId: 'guild-123',
      action: AuditActions.AUTOMOD_DELETE,
      targetId: 'user-link',
      reason: 'Automod: Posted link',
    });
    // Should NOT update XP
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('blocks messages containing blocked words', async () => {
    mockFindUniqueSettings.mockResolvedValue({
      guildId: 'guild-123',
      blockedWords: 'apple, banana',
    });

    const hasPermission = vi.fn().mockReturnValue(false);
    const deleteMessage = vi.fn().mockResolvedValue({});
    const channelSend = vi.fn().mockResolvedValue({
      delete: vi.fn(),
    });

    const message = {
      author: { bot: false, id: 'user-word' },
      guild: {},
      guildId: 'guild-123',
      content: 'I love eating an Apple today!',
      member: {
        permissions: {
          has: hasPermission,
        },
      },
      delete: deleteMessage,
      channel: {
        send: channelSend,
      },
    };

    await messageCreateEvent.execute(message as any);

    expect(deleteMessage).toHaveBeenCalled();
    expect(channelSend).toHaveBeenCalledWith(
      expect.stringContaining('contained a blocked word')
    );
    expect(mockWarningCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-word',
        guildId: 'guild-123',
        reason: 'Automod: Used blocked word',
      },
    });
    expect(mockLogAudit).toHaveBeenCalledWith({
      guildId: 'guild-123',
      action: AuditActions.AUTOMOD_DELETE,
      targetId: 'user-word',
      reason: 'Automod: Used blocked word',
    });
    // Should NOT update XP
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('awards XP and triggers level up if limit is reached', async () => {
    mockFindUniqueSettings.mockResolvedValue(null); // No settings/automod

    mockUserUpsert.mockResolvedValue({
      id: 'user-xp',
      guildId: 'guild-123',
      xp: 90, // needs 100 XP to level up (from Level 1)
      level: 1,
    });

    const hasPermission = vi.fn().mockReturnValue(false);
    const channelSend = vi.fn().mockResolvedValue({});

    const message = {
      author: { bot: false, id: 'user-xp' },
      guild: {},
      guildId: 'guild-123',
      content: 'Friendly chat message',
      member: {
        permissions: {
          has: hasPermission,
        },
      },
      channel: {
        send: channelSend,
      },
    };

    await messageCreateEvent.execute(message as any);

    expect(mockUserUpsert).toHaveBeenCalled();
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: {
        id_guildId: {
          id: 'user-xp',
          guildId: 'guild-123',
        },
      },
      data: {
        // level 1 needs 100 XP. Starting with 90 XP + (15 to 25 XP) => 105 to 115 XP.
        // New level: 2. New XP: (105-115) - 100 => 5 to 15 XP.
        xp: expect.any(Number),
        level: 2,
      },
    });
    expect(channelSend).toHaveBeenCalledWith(
      expect.stringContaining('leveled up to **Level 2**')
    );
  });
});
