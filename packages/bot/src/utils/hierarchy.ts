import { Guild, GuildMember } from 'discord.js';

export function checkHierarchy(
  guild: Guild,
  moderator: GuildMember,
  target: GuildMember
): { allowed: boolean; error?: string } {
  const botMember = guild.members.me;

  // Cannot moderate yourself
  if (target.id === moderator.id) {
    return { allowed: false, error: 'You cannot moderate yourself.' };
  }

  // Cannot moderate the server owner
  if (target.id === guild.ownerId) {
    return { allowed: false, error: 'You cannot moderate the server owner.' };
  }

  // Bot hierarchy check
  if (
    botMember &&
    botMember.roles.highest.position <= target.roles.highest.position
  ) {
    return {
      allowed: false,
      error: `I do not have high enough permissions to moderate ${target.user.tag}. My highest role must be above theirs.`,
    };
  }

  // Moderator hierarchy check
  if (
    moderator.id !== guild.ownerId &&
    moderator.roles.highest.position <= target.roles.highest.position
  ) {
    return {
      allowed: false,
      error: `You do not have high enough permissions to moderate ${target.user.tag}. Your highest role must be above theirs.`,
    };
  }

  return { allowed: true };
}
