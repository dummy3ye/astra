import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../command';
import { prisma } from '../../database/client';

export const leaderboardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Displays the top 10 users in the server by XP/Level.'),
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();

    const topUsers = await prisma.user.findMany({
      where: {
        guildId: interaction.guildId!,
      },
      orderBy: [{ level: 'desc' }, { xp: 'desc' }],
      take: 10,
    });

    if (topUsers.length === 0) {
      await interaction.editReply({
        content: 'No users have earned any XP yet!',
      });
      return;
    }

    let leaderboardStr = '🏆 **XP Leaderboard** 🏆\n\n';

    for (let i = 0; i < topUsers.length; i++) {
      const userRecord = topUsers[i];
      let username = `User#${userRecord.id}`;
      try {
        const discordUser = await interaction.client.users.fetch(userRecord.id);
        username = discordUser.username;
      } catch {
        // Fallback to userRecord.id
      }

      leaderboardStr += `${i + 1}. **${username}** - Level ${userRecord.level} (Total XP in level: ${userRecord.xp})\n`;
    }

    await interaction.editReply({
      content: leaderboardStr,
    });
  },
};
