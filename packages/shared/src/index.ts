export { contract } from './contract';
export type { Stats, Server, User, Warning, AuditEntry } from './types';

export const AuditActions = {
  BAN: 'ban',
  KICK: 'kick',
  PURGE: 'purge',
  WARN: 'warn',
  MEMBER_JOIN: 'member_join',
  MEMBER_LEAVE: 'member_leave',
  UNBAN: 'unban',
  TIMEOUT: 'timeout',
  UNTIMEOUT: 'untimeout',
  CLEAR_WARNINGS: 'clear_warnings',
  AUTOMOD_DELETE: 'automod_delete',
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];
