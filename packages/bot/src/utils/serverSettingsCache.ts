import { ServerSettings } from '@prisma/client';
import { prisma } from '../database/client';

const cache = new Map<string, { data: ServerSettings; expiry: number }>();
const TTL_MS = 60_000;

export async function getServerSettings(
  guildId: string
): Promise<ServerSettings | null> {
  const cached = cache.get(guildId);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  const settings = await prisma.serverSettings.findUnique({
    where: { guildId },
  });

  if (settings) {
    cache.set(guildId, { data: settings, expiry: Date.now() + TTL_MS });
  } else {
    cache.delete(guildId);
  }

  return settings;
}

export function invalidateServerSettings(guildId: string): void {
  cache.delete(guildId);
}
