import { prisma } from '../database/client';

export async function createWarning(params: {
  userId: string;
  guildId: string;
  reason: string;
}): Promise<void> {
  await prisma.user.upsert({
    where: {
      id_guildId: { id: params.userId, guildId: params.guildId },
    },
    create: {
      id: params.userId,
      guildId: params.guildId,
    },
    update: {},
  });

  await prisma.warning.create({
    data: {
      userId: params.userId,
      guildId: params.guildId,
      reason: params.reason,
    },
  });
}

export async function getWarningCount(
  userId: string,
  guildId: string
): Promise<number> {
  return prisma.warning.count({
    where: { userId, guildId },
  });
}

export interface WarningRecord {
  id: number;
  userId: string;
  guildId: string;
  reason: string;
  createdAt: Date;
}

export async function getUserWarnings(
  userId: string,
  guildId: string
): Promise<WarningRecord[]> {
  return prisma.warning.findMany({
    where: { userId, guildId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteUserWarnings(
  userId: string,
  guildId: string
): Promise<void> {
  await prisma.warning.deleteMany({
    where: { userId, guildId },
  });
}
