import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../command';
import { prisma } from '../../database/client';

export const automodCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure or view auto-moderation settings.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('Displays the current auto-moderation status.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('config')
        .setDescription('Configure auto-moderation settings.')
        .addStringOption((option) =>
          option
            .setName('blocked_words')
            .setDescription(
              'Comma-separated list of blocked words (leave empty to clear).'
            )
            .setRequired(false)
        )
        .addBooleanOption((option) =>
          option
            .setName('block_links')
            .setDescription('Enable or disable blocking of links.')
            .setRequired(false)
        )
    ) as SlashCommandBuilder,
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    if (subcommand === 'status') {
      const settings = await prisma.serverSettings.findUnique({
        where: { guildId },
      });

      const blockedWords = settings?.blockedWords || 'None';
      const blockLinks = settings?.blockLinks ? 'Enabled' : 'Disabled';

      await interaction.reply({
        content: `🛡️ **Auto-moderation Status**\n\n• **Blocked Words**: ${blockedWords}\n• **Link Blocking**: ${blockLinks}`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'config') {
      const blockedWords = interaction.options.getString('blocked_words');
      const blockLinks = interaction.options.getBoolean('block_links');

      const updateData: any = {};
      if (blockedWords !== null) {
        updateData.blockedWords = blockedWords.trim() || null;
      }
      if (blockLinks !== null) {
        updateData.blockLinks = blockLinks;
      }

      await prisma.serverSettings.upsert({
        where: { guildId },
        update: updateData,
        create: {
          guildId,
          ...updateData,
        },
      });

      await interaction.reply({
        content: '✅ Auto-moderation settings updated successfully!',
        ephemeral: true,
      });
    }
  },
};
