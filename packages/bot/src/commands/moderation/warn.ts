import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { AuditActions } from '@gallium/shared';
import { Command } from '../command';
import { logAudit } from '../../services/auditLog';
import { createWarning, getWarningCount } from '../../services/warnings';
import { checkHierarchy } from '../../utils/hierarchy';
import { prisma } from '../../database/client';

export const warnCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to warn')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('The reason for the warning')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);

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

    await createWarning({
      userId: user.id,
      guildId: interaction.guild.id,
      reason,
    });

    await logAudit({
      guildId: interaction.guild.id,
      action: AuditActions.WARN,
      targetId: user.id,
      reason,
      moderatorId: interaction.user.id,
    });

    const count = await getWarningCount(user.id, interaction.guild.id);

    // --- Warning Escalation ---
    const settings = await prisma.serverSettings.findUnique({
      where: { guildId: interaction.guild.id },
    });

    let escalationNote = '';

    if (settings?.warnBanThreshold && count >= settings.warnBanThreshold) {
      try {
        await target.ban({
          reason: `Auto-ban: reached ${count} warnings (threshold: ${settings.warnBanThreshold})`,
        });
        await logAudit({
          guildId: interaction.guild.id,
          action: AuditActions.BAN,
          targetId: user.id,
          reason: `Auto-ban: ${count} warnings`,
          moderatorId: interaction.client.user?.id,
        });
        escalationNote = `\n🔨 **Auto-banned** for reaching ${count} warnings.`;
      } catch {
        escalationNote =
          '\n⚠️ Could not auto-ban user (check bot permissions).';
      }
    } else if (
      settings?.warnTimeoutThreshold &&
      count >= settings.warnTimeoutThreshold
    ) {
      try {
        const ONE_HOUR = 60 * 60 * 1000;
        await target.timeout(
          ONE_HOUR,
          `Auto-timeout: reached ${count} warnings (threshold: ${settings.warnTimeoutThreshold})`
        );
        await logAudit({
          guildId: interaction.guild.id,
          action: AuditActions.TIMEOUT,
          targetId: user.id,
          reason: `Auto-timeout: ${count} warnings`,
          moderatorId: interaction.client.user?.id,
        });
        escalationNote = `\n⏱️ **Auto-timed out for 1 hour** for reaching ${count} warnings.`;
      } catch {
        escalationNote =
          '\n⚠️ Could not auto-timeout user (check bot permissions).';
      }
    }

    await interaction.reply({
      content: `Warned ${user.tag}. Reason: ${reason} (${count} warning${count === 1 ? '' : 's'} total)${escalationNote}`,
      ephemeral: true,
    });
  },
};
