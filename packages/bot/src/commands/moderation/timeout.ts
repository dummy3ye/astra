import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { AuditActions } from '@gallium/shared';
import { Command } from '../command';
import { logAudit } from '../../services/auditLog';
import { checkHierarchy } from '../../utils/hierarchy';

export const timeoutCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a user (mute them and restrict communication)')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to timeout')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('duration')
        .setDescription('The duration of the timeout')
        .setRequired(true)
        .addChoices(
          { name: '1 Minute', value: 60 * 1000 },
          { name: '5 Minutes', value: 5 * 60 * 1000 },
          { name: '10 Minutes', value: 10 * 60 * 1000 },
          { name: '1 Hour', value: 60 * 60 * 1000 },
          { name: '1 Day', value: 24 * 60 * 60 * 1000 },
          { name: '1 Week', value: 7 * 24 * 60 * 60 * 1000 }
        )
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the timeout')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const user = interaction.options.getUser('user', true);
    const duration = interaction.options.getInteger('duration', true);
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

    try {
      await target.timeout(duration, reason);

      await logAudit({
        guildId: interaction.guild.id,
        action: AuditActions.TIMEOUT,
        targetId: user.id,
        reason: `${reason} (Duration: ${duration / 1000}s)`,
      });

      await interaction.reply({
        content: `Timed out ${user.tag} for ${duration / 1000}s. Reason: ${reason}`,
        ephemeral: true,
      });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: `Failed to timeout ${user.tag}. Make sure they are in the server and the bot has permission to moderate them.`,
        ephemeral: true,
      });
    }
  },
};
