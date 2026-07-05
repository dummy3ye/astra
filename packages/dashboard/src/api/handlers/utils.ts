export const SORTABLE_USER_FIELDS = [
  'id',
  'guildId',
  'xp',
  'level',
  'username',
  'displayName',
];

export const SORTABLE_WARNING_FIELDS = [
  'id',
  'userId',
  'guildId',
  'reason',
  'createdAt',
];

export const SORTABLE_AUDIT_FIELDS = [
  'id',
  'guildId',
  'action',
  'targetId',
  'targetName',
  'moderatorId',
  'moderatorName',
  'reason',
  'createdAt',
];

export function buildOrderBy(
  sortBy: string | undefined,
  sortOrder: string | undefined,
  allowed: string[]
) {
  return sortBy && allowed.includes(sortBy)
    ? { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' }
    : undefined;
}
