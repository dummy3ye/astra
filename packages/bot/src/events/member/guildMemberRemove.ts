import { GuildMember, PartialGuildMember, TextChannel } from 'discord.js';
import { AuditActions } from '@astra/shared';
import { prisma } from '../../database/client';
import { logAudit } from '../../services/auditLog';
import { Event } from '../event';

const guildMemberRemoveEvent: Event<'guildMemberRemove'> = {
  name: 'guildMemberRemove',
  execute: async (member: GuildMember | PartialGuildMember) => {
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
  },
};

export default guildMemberRemoveEvent;
