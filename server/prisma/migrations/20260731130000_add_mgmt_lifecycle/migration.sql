-- Thread lifecycle is soft-state so archive/restore and audit retention are safe.
ALTER TABLE "MgmtThread" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "MgmtThread" ADD COLUMN "deletedAt" DATETIME;

CREATE INDEX "MgmtThread_teacherId_deletedAt_idx" ON "MgmtThread"("teacherId", "deletedAt");
