import { AuditAction } from '@gallium/shared';
import { EmbedBuilder, TextChannel } from 'discord.js';
import { prisma } from '../database/client';
import { getClient } from '../utils/clientInstance';

const ACTION_COLORS: Record<string, number> = {
  ban: 0xe74c3c,
  kick: 0xe67e22,
  warn: 0xf1c40f,
  timeout: 0x9b59b6,
  untimeout: 0x2ecc71,
  unban: 0x2ecc71,
  purge: 0x3498db,
  clear_warnings: 0x95a5a6,
  automod_delete: 0xe74c3c,
  member_join: 0x2ecc71,
  member_leave: 0x95a5a6,
};

const ACTION_LABELS: Record<string, string> = {
  ban: '🔨 Member Banned',
  kick: '👢 Member Kicked',
  warn: '⚠️ Member Warned',
  timeout: '⏱️ Member Timed Out',
  untimeout: '✅ Timeout Removed',
  unban: '✅ Member Unbanned',
  purge: '🗑️ Messages Purged',
  clear_warnings: '🧹 Warnings Cleared',
  automod_delete: '🛡️ Automod: Message Deleted',
  member_join: '📥 Member Joined',
  member_leave: '📤 Member Left',
};

export async function logAudit(params: {
  guildId: string;
  action: AuditAction;
  targetId: string;
  reason?: string;
  moderatorId?: string;
}): Promise<void> {
  // 1. Write to the database
  await prisma.auditLog.create({
    data: {
      guildId: params.guildId,
      action: params.action,
      targetId: params.targetId,
      reason: params.reason,
    },
  });

  // 2. Post embed to the configured log channel (best-effort)
  try {
    const settings = await prisma.serverSettings.findUnique({
      where: { guildId: params.guildId },
    });

    if (!settings?.logChannelId) return;

    const client = getClient();
    const channel = await client.channels.fetch(settings.logChannelId);
    if (!channel || !(channel instanceof TextChannel)) return;

    const color = ACTION_COLORS[params.action] ?? 0x99aab5;
    const label = ACTION_LABELS[params.action] ?? `Action: ${params.action}`;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(label)
      .addFields(
        { name: 'Target', value: `<@${params.targetId}>`, inline: true },
        ...(params.moderatorId
          ? [{ name: 'Moderator', value: `<@${params.moderatorId}>`, inline: true }]
          : []),
        { name: 'Reason', value: params.reason ?? 'No reason provided', inline: false },
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch {
    // Never crash the bot if log channel posting fails
  }
}
