import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../command';
import { getUserWarnings } from '../../services/warnings';

export const warningsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View the warning history of a user')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to view warnings for (default: yourself)')
        .setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const user = interaction.options.getUser('user') || interaction.user;

    if (!interaction.guild) return;

    // Check permissions if checking someone else
    if (user.id !== interaction.user.id) {
      const hasPermission = interaction.memberPermissions?.has(
        PermissionFlagsBits.ModerateMembers
      );
      if (!hasPermission) {
        await interaction.reply({
          content: "You do not have permission to view other users' warnings.",
          ephemeral: true,
        });
        return;
      }
    }

    try {
      const warnings = await getUserWarnings(user.id, interaction.guild.id);

      if (warnings.length === 0) {
        await interaction.reply({
          content: `${user.tag} has no warnings.`,
          ephemeral: true,
        });
        return;
      }

      const warningList = warnings
        .map(
          (w, index) =>
            `${index + 1}. [${w.createdAt.toLocaleDateString()}] ${w.reason}`
        )
        .join('\n');

      await interaction.reply({
        content: `Warnings for ${user.tag} (${warnings.length} total):\n${warningList}`,
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: 'Failed to retrieve warnings.',
        ephemeral: true,
      });
    }
  },
};
