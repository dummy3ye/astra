import { Guild } from 'discord.js';
import { prisma } from '../../database/client';
import { Event } from '../event';

const guildCreateEvent: Event<'guildCreate'> = {
  name: 'guildCreate',
  execute: async (guild: Guild) => {
    await prisma.serverSettings.upsert({
      where: { guildId: guild.id },
      update: {
        name: guild.name,
        icon: guild.icon,
      },
      create: {
        guildId: guild.id,
        name: guild.name,
        icon: guild.icon,
      },
    });
  },
};

export default guildCreateEvent;
