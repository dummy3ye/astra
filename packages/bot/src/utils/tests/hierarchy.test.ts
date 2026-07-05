import { describe, it, expect } from 'vitest';
import { checkHierarchy } from '../hierarchy';

function makeMember(id: string, rolePosition: number, tag?: string) {
  return {
    id,
    user: { tag: tag ?? `user#${id}` },
    roles: {
      highest: { position: rolePosition },
    },
  } as never;
}

function makeGuild(ownerId: string, botPosition: number) {
  return {
    id: 'guild-123',
    ownerId,
    members: {
      me: {
        roles: {
          highest: { position: botPosition },
        },
      },
    },
  } as never;
}

describe('checkHierarchy', () => {
  it('returns allowed when moderator is above target', () => {
    const guild = makeGuild('owner-1', 20);
    const moderator = makeMember('mod-1', 15);
    const target = makeMember('target-1', 5);

    const result = checkHierarchy(guild, moderator, target);

    expect(result.allowed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('blocks self-moderation', () => {
    const guild = makeGuild('owner-1', 20);
    const member = makeMember('user-1', 10);

    const result = checkHierarchy(guild, member, member);

    expect(result.allowed).toBe(false);
    expect(result.error).toBe('You cannot moderate yourself.');
  });

  it('blocks moderation of server owner', () => {
    const guild = makeGuild('owner-1', 20);
    const moderator = makeMember('mod-1', 15);
    const owner = makeMember('owner-1', 100);

    const result = checkHierarchy(guild, moderator, owner);

    expect(result.allowed).toBe(false);
    expect(result.error).toBe('You cannot moderate the server owner.');
  });

  it('blocks when bot role is not high enough', () => {
    const guild = makeGuild('owner-1', 5);
    const moderator = makeMember('mod-1', 15);
    const target = makeMember('target-1', 10);

    const result = checkHierarchy(guild, moderator, target);

    expect(result.allowed).toBe(false);
    expect(result.error).toContain('I do not have high enough permissions');
  });

  it('blocks when moderator role is not high enough', () => {
    const guild = makeGuild('owner-1', 20);
    const moderator = makeMember('mod-1', 5);
    const target = makeMember('target-1', 10);

    const result = checkHierarchy(guild, moderator, target);

    expect(result.allowed).toBe(false);
    expect(result.error).toContain('You do not have high enough permissions');
  });

  it('allows server owner to moderate anyone', () => {
    const guild = makeGuild('owner-1', 60);
    const owner = makeMember('owner-1', 100);
    const target = makeMember('target-1', 50);

    const result = checkHierarchy(guild, owner, target);

    expect(result.allowed).toBe(true);
  });

  it('blocks when roles are equal (not owner)', () => {
    const guild = makeGuild('owner-1', 20);
    const moderator = makeMember('mod-1', 10);
    const target = makeMember('target-1', 10);

    const result = checkHierarchy(guild, moderator, target);

    expect(result.allowed).toBe(false);
    expect(result.error).toContain('You do not have high enough permissions');
  });
});
