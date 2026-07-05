import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { AuditActions } from '@astra/shared';
import { Command } from '../command';
import { logAudit } from '../../services/auditLog';
import { checkHierarchy } from '../../utils/hierarchy';

export const banCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to ban').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for banning')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const user = interaction.options.getUser('user', true);
    const reason =
      interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.guild) return;

    const moderator = await interaction.guild.members.fetch(
      interaction.user.id
    );
    const target = await interaction.guild.members.fetch(user.id);

    const { allowed, error } = checkHierarchy(
      interaction.guild,
      moderator,
      target
    );
    if (!allowed) {
      return void (await interaction.reply({
        content: error,
        ephemeral: true,
      }));
    }

    await interaction.guild.members.ban(user.id, { reason });

    await logAudit({
      guildId: interaction.guild.id,
      action: AuditActions.BAN,
      targetId: user.id,
      reason,
    });

    await interaction.reply({
      content: `Banned ${user.tag}. Reason: ${reason}`,
      ephemeral: true,
    });
  },
};
