import { GuildMember, PartialGuildMember, TextChannel } from 'discord.js';
import { AuditActions } from '@gallium/shared';
import { prisma } from '../../database/client';
import { logAudit } from '../../services/auditLog';

export const handleGuildMemberAdd = async (member: GuildMember) => {
  const settings = await prisma.serverSettings.findUnique({
    where: { guildId: member.guild.id },
  });

  if (settings?.welcomeChannelId) {
    const channel = member.guild.channels.cache.get(
      settings.welcomeChannelId
    ) as TextChannel;
    if (channel) {
      await channel.send(`Welcome to the server, ${member.user.tag}!`);
    }
  }

  await logAudit({
    guildId: member.guild.id,
    action: AuditActions.MEMBER_JOIN,
    targetId: member.id,
  });
};

export const handleGuildMemberRemove = async (
  member: GuildMember | PartialGuildMember
) => {
  const settings = await prisma.serverSettings.findUnique({
    where: { guildId: member.guild.id },
  });

  if (settings?.logChannelId) {
    const channel = member.guild.channels.cache.get(
      settings.logChannelId
    ) as TextChannel;
    if (channel) {
      await channel.send(
        `${member.user?.tag || 'A user'} has left the server.`
      );
    }
  }

  await logAudit({
    guildId: member.guild.id,
    action: AuditActions.MEMBER_LEAVE,
    targetId: member.id,
  });
};
