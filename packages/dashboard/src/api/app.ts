import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createExpressEndpoints, initServer } from '@ts-rest/express';
import { contract } from '@astra/shared';
import { getStatsHandler } from './handlers/stats';
import { getServersHandler } from './handlers/servers';
import { getUsersHandler } from './handlers/users';
import { getWarningsHandler } from './handlers/warnings';
import { getAuditLogHandler } from './handlers/auditLog';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(opts?: {
  databaseUrl?: string;
  prisma?: PrismaClient;
}) {
  const app = express();

  const url =
    opts?.databaseUrl ?? process.env.DATABASE_URL ?? 'file:../bot/dev.db';
  const prisma =
    opts?.prisma ?? new PrismaClient({ adapter: new PrismaLibSql({ url }) });

  app.use(cors());
  app.use(express.json());

  const dist = path.join(__dirname, '../web');
  app.use(express.static(dist));

  const s = initServer();

  const router = s.router(contract, {
    getStats: getStatsHandler(prisma),
    getServers: getServersHandler(prisma),
    getUsers: getUsersHandler(prisma),
    getWarnings: getWarningsHandler(prisma),
    getAuditLog: getAuditLogHandler(prisma),
  } as never);

  createExpressEndpoints(contract, router, app);

  app.get('*', (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'));
  });

  return app;
}
