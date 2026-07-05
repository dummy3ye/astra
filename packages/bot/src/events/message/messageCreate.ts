import { Message, TextChannel } from 'discord.js';
import { AuditActions } from '@astra/shared';
import { prisma } from '../../database/client';
import { logAudit } from '../../services/auditLog';
import { Event } from '../event';

// Cooldown map: key is "guildId-userId", value is timestamp of last XP gain
const xpCooldowns = new Map<string, number>();

const messageCreateEvent: Event<'messageCreate'> = {
  name: 'messageCreate',
  execute: async (message: Message) => {
    // 1. Ignore bot messages and direct messages
    if (message.author.bot || !message.guild || !message.guildId) return;

    const channel = message.channel as TextChannel;

    // 2. Fetch Server Settings for Automod config
    const settings = await prisma.serverSettings.findUnique({
      where: { guildId: message.guildId },
    });

    const isBypassed =
      message.member?.permissions.has('ManageMessages') ||
      message.member?.permissions.has('Administrator');

    if (settings && !isBypassed) {
      // 3. Automod: Link Blocking
      if (settings.blockLinks) {
        const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
        if (urlRegex.test(message.content)) {
          await message.delete().catch(() => {});
          const warnMsg = await channel.send(
            `${message.author}, posting links is not allowed in this server!`
          );
          setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

          // Get or create user to link the warning (Prisma Warning model references User)
          await prisma.user.upsert({
            where: {
              id_guildId: {
                id: message.author.id,
                guildId: message.guildId,
              },
            },
            update: {},
            create: {
              id: message.author.id,
              guildId: message.guildId,
            },
          });

          await prisma.warning.create({
            data: {
              userId: message.author.id,
              guildId: message.guildId,
              reason: 'Automod: Posted link',
            },
          });

          await logAudit({
            guildId: message.guildId,
            action: AuditActions.AUTOMOD_DELETE,
            targetId: message.author.id,
            reason: 'Automod: Posted link',
          });

          return; // Stop processing further (no XP for blocked messages)
        }
      }

      // 4. Automod: Blocked Words
      if (settings.blockedWords) {
        const blocked = settings.blockedWords
          .split(',')
          .map((w) => w.trim().toLowerCase())
          .filter(Boolean);

        const contentLower = message.content.toLowerCase();
        const hasBlockedWord = blocked.some((word) => {
          const regex = new RegExp(`\\b${word}\\b`, 'i');
          return regex.test(contentLower);
        });

        if (hasBlockedWord) {
          await message.delete().catch(() => {});
          const warnMsg = await channel.send(
            `${message.author}, your message contained a blocked word!`
          );
          setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

          await prisma.user.upsert({
            where: {
              id_guildId: {
                id: message.author.id,
                guildId: message.guildId,
              },
            },
            update: {},
            create: {
              id: message.author.id,
              guildId: message.guildId,
            },
          });

          await prisma.warning.create({
            data: {
              userId: message.author.id,
              guildId: message.guildId,
              reason: 'Automod: Used blocked word',
            },
          });

          await logAudit({
            guildId: message.guildId,
            action: AuditActions.AUTOMOD_DELETE,
            targetId: message.author.id,
            reason: 'Automod: Used blocked word',
          });

          return; // Stop processing further
        }
      }
    }

    // 5. XP & Leveling System
    const cooldownKey = `${message.guildId}-${message.author.id}`;
    const lastXpTime = xpCooldowns.get(cooldownKey) || 0;
    const now = Date.now();

    // 1-minute cooldown per user
    if (now - lastXpTime >= 60000) {
      xpCooldowns.set(cooldownKey, now);

      const xpToGive = Math.floor(Math.random() * 11) + 15; // Random 15-25 XP

      const user = await prisma.user.upsert({
        where: {
          id_guildId: {
            id: message.author.id,
            guildId: message.guildId,
          },
        },
        update: {},
        create: {
          id: message.author.id,
          guildId: message.guildId,
          xp: 0,
          level: 1,
        },
      });

      let newXp = user.xp + xpToGive;
      let newLevel = user.level;
      let leveledUp = false;

      // Level up algorithm: level * 100 XP required per level
      while (newXp >= newLevel * 100) {
        newXp -= newLevel * 100;
        newLevel += 1;
        leveledUp = true;
      }

      await prisma.user.update({
        where: {
          id_guildId: {
            id: message.author.id,
            guildId: message.guildId,
          },
        },
        data: {
          xp: newXp,
          level: newLevel,
        },
      });

      if (leveledUp) {
        await channel
          .send(
            `🎉 Congratulations ${message.author}, you leveled up to **Level ${newLevel}**!`
          )
          .catch(() => {});

        // --- XP Role Rewards ---
        try {
          const levelRoles = await prisma.levelRole.findMany({
            where: { guildId: message.guildId!, level: newLevel },
          });
          if (levelRoles.length > 0 && message.member) {
            for (const lr of levelRoles) {
              const role = message.guild?.roles.cache.get(lr.roleId);
              if (role) {
                await message.member.roles.add(
                  role,
                  `Reached Level ${newLevel}`
                );
              }
            }
          }
        } catch {
          // Best-effort: don't crash if role assignment fails
        }
      }
    }
  },
};

export default messageCreateEvent;
