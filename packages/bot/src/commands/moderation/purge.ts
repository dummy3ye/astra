import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import { AuditActions } from '@astra/shared';
import { Command } from '../command';
import { logAudit } from '../../services/auditLog';

export const purgeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete a number of messages')
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('The number of messages to delete')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const amount = interaction.options.getInteger('amount')!;

    if (
      !interaction.channel ||
      !(interaction.channel instanceof TextChannel) ||
      !interaction.guild
    )
      return;

    await interaction.channel.bulkDelete(amount, true);

    await logAudit({
      guildId: interaction.guild.id,
      action: AuditActions.PURGE,
      targetId: interaction.channel.id,
      reason: `${amount} messages deleted`,
    });

    await interaction.reply({
      content: `Purged ${amount} messages.`,
      ephemeral: true,
    });
  },
};
