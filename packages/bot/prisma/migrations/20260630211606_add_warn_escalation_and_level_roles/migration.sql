-- AlterTable
ALTER TABLE "ServerSettings" ADD COLUMN "warnBanThreshold" INTEGER;
ALTER TABLE "ServerSettings" ADD COLUMN "warnTimeoutThreshold" INTEGER;

-- CreateTable
CREATE TABLE "LevelRole" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guildId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "roleId" TEXT NOT NULL,
    CONSTRAINT "LevelRole_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "ServerSettings" ("guildId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LevelRole_guildId_level_key" ON "LevelRole"("guildId", "level");
