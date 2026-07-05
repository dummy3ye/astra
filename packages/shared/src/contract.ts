import { initContract } from '@ts-rest/core';
import type { Stats, Server, User, Warning, AuditEntry } from './types';

const c = initContract();

export const contract = c.router({
  getStats: {
    method: 'GET',
    path: '/api/stats',
    responses: {
      200: c.response<Stats>(),
      500: c.response<{ error: string }>(),
    },
  },
  getServers: {
    method: 'GET',
    path: '/api/servers',
    responses: {
      200: c.response<Server[]>(),
      500: c.response<{ error: string }>(),
    },
  },
  getUsers: {
    method: 'GET',
    path: '/api/users',
    responses: {
      200: c.response<{ items: User[]; total: number }>(),
      500: c.response<{ error: string }>(),
    },
  },
  getWarnings: {
    method: 'GET',
    path: '/api/warnings',
    responses: {
      200: c.response<{ items: Warning[]; total: number }>(),
      500: c.response<{ error: string }>(),
    },
  },
  getAuditLog: {
    method: 'GET',
    path: '/api/audit-log',
    responses: {
      200: c.response<{ items: AuditEntry[]; total: number }>(),
      500: c.response<{ error: string }>(),
    },
  },
});
