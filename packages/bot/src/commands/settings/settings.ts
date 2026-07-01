import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../command';
import { prisma } from '../../database/client';

export const settingsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('View or configure server settings.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    // --- status ---
    .addSubcommand((s) =>
      s.setName('status').setDescription('Show current server settings.')
    )

    // --- channels ---
    .addSubcommand((s) =>
      s
        .setName('channels')
        .setDescription('Configure welcome and log channels.')
        .addChannelOption((o) =>
          o
            .setName('log_channel')
            .setDescription('Channel to post moderation logs.')
            .setRequired(false)
        )
        .addChannelOption((o) =>
          o
            .setName('welcome_channel')
            .setDescription('Channel to greet new members.')
            .setRequired(false)
        )
    )

    // --- warn-escalation ---
    .addSubcommand((s) =>
      s
        .setName('warn-escalation')
        .setDescription('Configure automatic actions when warning thresholds are reached.')
        .addIntegerOption((o) =>
          o
            .setName('timeout_at')
            .setDescription('Auto-timeout user when they reach this many warnings (0 to disable).')
            .setMinValue(0)
            .setRequired(false)
        )
        .addIntegerOption((o) =>
          o
            .setName('ban_at')
            .setDescription('Auto-ban user when they reach this many warnings (0 to disable).')
            .setMinValue(0)
            .setRequired(false)
        )
    )

    // --- level-role ---
    .addSubcommand((s) =>
      s
        .setName('level-role')
        .setDescription('Grant a role automatically when a user reaches a level.')
        .addIntegerOption((o) =>
          o
            .setName('level')
            .setDescription('The level that triggers the role grant.')
            .setMinValue(1)
            .setRequired(true)
        )
        .addRoleOption((o) =>
          o
            .setName('role')
            .setDescription('The role to grant. Leave empty to remove the reward for this level.')
            .setRequired(false)
        )
    ) as SlashCommandBuilder,

  execute: async (interaction: ChatInputCommandInteraction) => {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    // ── status ────────────────────────────────────────────────────────────────
    if (sub === 'status') {
      const settings = await prisma.serverSettings.findUnique({
        where: { guildId },
        include: { levelRoles: { orderBy: { level: 'asc' } } },
      });

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('⚙️ Server Settings')
        .addFields(
          {
            name: '📋 Channels',
            value: [
              `• Log Channel: ${settings?.logChannelId ? `<#${settings.logChannelId}>` : 'Not set'}`,
              `• Welcome Channel: ${settings?.welcomeChannelId ? `<#${settings.welcomeChannelId}>` : 'Not set'}`,
            ].join('\n'),
          },
          {
            name: '⚠️ Warning Escalation',
            value: [
              `• Timeout at: ${settings?.warnTimeoutThreshold ?? 'Disabled'} warnings`,
              `• Ban at: ${settings?.warnBanThreshold ?? 'Disabled'} warnings`,
            ].join('\n'),
          },
          {
            name: '🛡️ Automod',
            value: [
              `• Block Links: ${settings?.blockLinks ? 'Enabled' : 'Disabled'}`,
              `• Blocked Words: ${settings?.blockedWords || 'None'}`,
            ].join('\n'),
          },
          {
            name: '🎖️ Level Roles',
            value:
              settings?.levelRoles.length
                ? settings.levelRoles
                    .map((lr) => `• Level ${lr.level} → <@&${lr.roleId}>`)
                    .join('\n')
                : 'No level roles configured',
          }
        )
        .setTimestamp();

      return void (await interaction.reply({ embeds: [embed], ephemeral: true }));
    }

    // ── channels ──────────────────────────────────────────────────────────────
    if (sub === 'channels') {
      const logChannel = interaction.options.getChannel('log_channel');
      const welcomeChannel = interaction.options.getChannel('welcome_channel');

      if (!logChannel && !welcomeChannel) {
        return void (await interaction.reply({
          content: 'Please provide at least one channel to configure.',
          ephemeral: true,
        }));
      }

      const updateData: Record<string, string | null> = {};
      if (logChannel !== undefined)
        updateData.logChannelId = logChannel?.id ?? null;
      if (welcomeChannel !== undefined)
        updateData.welcomeChannelId = welcomeChannel?.id ?? null;

      await prisma.serverSettings.upsert({
        where: { guildId },
        update: updateData,
        create: { guildId, ...updateData },
      });

      const lines = [];
      if (logChannel !== undefined)
        lines.push(`• Log channel: ${logChannel ? `<#${logChannel.id}>` : 'cleared'}`);
      if (welcomeChannel !== undefined)
        lines.push(`• Welcome channel: ${welcomeChannel ? `<#${welcomeChannel.id}>` : 'cleared'}`);

      return void (await interaction.reply({
        content: `✅ Channels updated:\n${lines.join('\n')}`,
        ephemeral: true,
      }));
    }

    // ── warn-escalation ───────────────────────────────────────────────────────
    if (sub === 'warn-escalation') {
      const timeoutAt = interaction.options.getInteger('timeout_at');
      const banAt = interaction.options.getInteger('ban_at');

      if (timeoutAt === null && banAt === null) {
        return void (await interaction.reply({
          content: 'Please provide at least one threshold to configure.',
          ephemeral: true,
        }));
      }

      const updateData: Record<string, number | null> = {};
      if (timeoutAt !== null)
        updateData.warnTimeoutThreshold = timeoutAt === 0 ? null : timeoutAt;
      if (banAt !== null)
        updateData.warnBanThreshold = banAt === 0 ? null : banAt;

      await prisma.serverSettings.upsert({
        where: { guildId },
        update: updateData,
        create: { guildId, ...updateData },
      });

      const lines = [];
      if (timeoutAt !== null)
        lines.push(
          `• Auto-timeout at: ${timeoutAt === 0 ? 'Disabled' : `${timeoutAt} warnings`}`
        );
      if (banAt !== null)
        lines.push(`• Auto-ban at: ${banAt === 0 ? 'Disabled' : `${banAt} warnings`}`);

      return void (await interaction.reply({
        content: `✅ Warning escalation updated:\n${lines.join('\n')}`,
        ephemeral: true,
      }));
    }

    // ── level-role ────────────────────────────────────────────────────────────
    if (sub === 'level-role') {
      const level = interaction.options.getInteger('level', true);
      const role = interaction.options.getRole('role');

      // Ensure the ServerSettings row exists first
      await prisma.serverSettings.upsert({
        where: { guildId },
        update: {},
        create: { guildId },
      });

      if (!role) {
        // Remove the reward for this level
        await prisma.levelRole.deleteMany({ where: { guildId, level } });
        return void (await interaction.reply({
          content: `✅ Removed level role reward for Level ${level}.`,
          ephemeral: true,
        }));
      }

      await prisma.levelRole.upsert({
        where: { guildId_level: { guildId, level } },
        update: { roleId: role.id },
        create: { guildId, level, roleId: role.id },
      });

      return void (await interaction.reply({
        content: `✅ Users who reach **Level ${level}** will now receive <@&${role.id}>.`,
        ephemeral: true,
      }));
    }
  },
};
