import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { AuditActions } from '@gallium/shared';
import { Command } from '../command';
import { logAudit } from '../../services/auditLog';

export const untimeoutCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove timeout from a user')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to remove timeout from')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('The reason for removing the timeout')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const user = interaction.options.getUser('user', true);
    const reason =
      interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.guild) return;

    try {
      const member = await interaction.guild.members.fetch(user.id);
      await member.timeout(null, reason);

      await logAudit({
        guildId: interaction.guild.id,
        action: AuditActions.UNTIMEOUT,
        targetId: user.id,
        reason,
      });

      await interaction.reply({
        content: `Removed timeout from ${user.tag}. Reason: ${reason}`,
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: `Failed to remove timeout from ${user.tag}. Make sure they are in the server and the bot has permission to moderate them.`,
        ephemeral: true,
      });
    }
  },
};
