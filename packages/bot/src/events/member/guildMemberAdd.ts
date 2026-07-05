import { GuildMember, TextChannel } from 'discord.js';
import { AuditActions } from '@astra/shared';
import { prisma } from '../../database/client';
import { logAudit } from '../../services/auditLog';
import { Event } from '../event';

const guildMemberAddEvent: Event<'guildMemberAdd'> = {
  name: 'guildMemberAdd',
  execute: async (member: GuildMember) => {
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
  },
};

export default guildMemberAddEvent;
