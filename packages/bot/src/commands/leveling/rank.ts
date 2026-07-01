import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../command';
import { prisma } from '../../database/client';

export const rankCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Displays your rank and leveling progress.')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user whose rank you want to view.')
        .setRequired(false)
    ) as SlashCommandBuilder,
  execute: async (interaction: ChatInputCommandInteraction) => {
    const targetUser = interaction.options.getUser('user') || interaction.user;

    const dbUser = await prisma.user.findUnique({
      where: {
        id_guildId: {
          id: targetUser.id,
          guildId: interaction.guildId!,
        },
      },
    });

    const xp = dbUser?.xp || 0;
    const level = dbUser?.level || 1;
    const nextLevelXp = level * 100;
    const progressPercent = Math.min(100, Math.floor((xp / nextLevelXp) * 100));

    // Create a progress bar: 10 characters long
    const filledChars = Math.floor(progressPercent / 10);
    const emptyChars = 10 - filledChars;
    const progressBar = '█'.repeat(filledChars) + '░'.repeat(emptyChars);

    await interaction.reply({
      content: `📊 **Rank for ${targetUser.username}**\n**Level**: ${level}\n**XP**: ${xp} / ${nextLevelXp} XP\nProgress: \`${progressBar}\` (${progressPercent}%)`,
    });
  },
};
