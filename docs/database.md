# Database Schema

## ServerSettings

| Column | Type | Description |
|---|---|---|
| guildId | String (PK) | Discord guild ID |
| name | String? | Guild name |
| icon | String? | Guild icon hash |
| blockLinks | Boolean | Automod: block link posting |
| blockedWords | String? | Automod: comma-separated blocked words |

## User

| Column | Type | Description |
|---|---|---|
| id | String | Discord user ID |
| guildId | String | Discord guild ID |
| username | String? | Discord username |
| displayName | String? | Discord display name |
| avatar | String? | Discord avatar hash |
| xp | Int | Total XP |
| level | Int | Current level |

Composite PK: `(id, guildId)`

## Warning

| Column | Type | Description |
|---|---|---|
| id | Int (auto) | Primary key |
| userId | String | Discord user ID |
| guildId | String | Discord guild ID |
| reason | String | Warning reason |
| createdAt | DateTime | Timestamp |

## AuditLog

| Column | Type | Description |
|---|---|---|
| id | Int (auto) | Primary key |
| guildId | String | Discord guild ID |
| action | String | Action enum |
| targetId | String? | Target user ID |
| targetName | String? | Target user's display name |
| moderatorId | String? | Moderator user ID |
| moderatorName | String? | Moderator's display name |
| reason | String? | Reason |
| createdAt | DateTime | Timestamp |

## LevelRole

| Column | Type | Description |
|---|---|---|
| id | Int (auto) | Primary key |
| guildId | String | Discord guild ID |
| level | Int | Required level |
| roleId | String | Discord role ID to assign |
