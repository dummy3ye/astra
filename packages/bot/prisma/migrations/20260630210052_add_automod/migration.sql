-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ServerSettings" (
    "guildId" TEXT NOT NULL PRIMARY KEY,
    "prefix" TEXT NOT NULL DEFAULT '!',
    "welcomeChannelId" TEXT,
    "logChannelId" TEXT,
    "blockedWords" TEXT,
    "blockLinks" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_ServerSettings" ("guildId", "logChannelId", "prefix", "welcomeChannelId") SELECT "guildId", "logChannelId", "prefix", "welcomeChannelId" FROM "ServerSettings";
DROP TABLE "ServerSettings";
ALTER TABLE "new_ServerSettings" RENAME TO "ServerSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
