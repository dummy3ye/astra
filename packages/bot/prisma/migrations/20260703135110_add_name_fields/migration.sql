-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "moderatorId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "moderatorName" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "targetName" TEXT;

-- AlterTable
ALTER TABLE "ServerSettings" ADD COLUMN "icon" TEXT;
ALTER TABLE "ServerSettings" ADD COLUMN "name" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatar" TEXT;
ALTER TABLE "User" ADD COLUMN "displayName" TEXT;
ALTER TABLE "User" ADD COLUMN "username" TEXT;
