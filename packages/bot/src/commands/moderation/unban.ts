import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { AuditActions } from '@gallium/shared';
import { Command } from '../command';
import { logAudit } from '../../services/auditLog';

export const unbanCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server')
    .addStringOption((option) =>
      option
        .setName('user_id')
        .setDescription('The ID of the user to unban')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for unbanning')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const userId = interaction.options.getString('user_id', true);
    const reason =
      interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.guild) return;

    try {
      await interaction.guild.members.unban(userId, reason);

      await logAudit({
        guildId: interaction.guild.id,
        action: AuditActions.UNBAN,
        targetId: userId,
        reason,
      });

      await interaction.reply({
        content: `Unbanned user ID ${userId}. Reason: ${reason}`,
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: `Failed to unban user ID ${userId}. Make sure the ID is correct and they are currently banned.`,
        ephemeral: true,
      });
    }
  },
};
