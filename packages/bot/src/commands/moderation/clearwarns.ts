import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { AuditActions } from '@gallium/shared';
import { Command } from '../command';
import { logAudit } from '../../services/auditLog';
import { deleteUserWarnings } from '../../services/warnings';

export const clearwarnsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('Clear all warnings for a user')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to clear warnings for')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const user = interaction.options.getUser('user', true);

    if (!interaction.guild) return;

    try {
      await deleteUserWarnings(user.id, interaction.guild.id);

      await logAudit({
        guildId: interaction.guild.id,
        action: AuditActions.CLEAR_WARNINGS,
        targetId: user.id,
      });

      await interaction.reply({
        content: `Cleared all warnings for ${user.tag}.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: `Failed to clear warnings for ${user.tag}.`,
        ephemeral: true,
      });
    }
  },
};
