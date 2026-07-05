export interface Stats {
  totalUsers: number;
  totalServers: number;
  totalWarnings: number;
  totalBans: number;
  recentWarnings: {
    id: string;
    userId: string;
    userName: string | null;
    reason: string;
    createdAt: string;
  }[];
  auditActionBreakdown: { action: string; count: number }[];
  warningsByDay: { date: string; count: number }[];
}

export interface Server {
  guildId: string;
  name: string | null;
  icon: string | null;
  memberCount: number;
  warningCount: number;
  blockLinks: boolean;
  blockedWords: string;
  warnTimeoutThreshold: number;
  warnBanThreshold: number;
  levelRoles: number;
}

export interface User {
  id: string;
  guildId: string;
  xp: number;
  level: number;
  warnings: number;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
}

export interface Warning {
  id: string;
  userId: string;
  guildId: string;
  reason: string;
  createdAt: string;
  userLevel: number;
  userXp: number;
  userName: string | null;
  userDisplayName: string | null;
  userAvatar: string | null;
}

export interface AuditEntry {
  id: string;
  guildId: string;
  action: string;
  targetId: string;
  targetName: string | null;
  moderatorId: string;
  moderatorName: string | null;
  reason: string | null;
  createdAt: string;
}
