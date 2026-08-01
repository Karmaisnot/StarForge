-- Add a stable, machine-readable role for route/API authorization. Existing
-- teachers remain teachers by default, preserving already seeded databases.
ALTER TABLE "Teacher" ADD COLUMN "roleKey" TEXT NOT NULL DEFAULT 'teacher';

-- Persist staff workspace state server-side instead of keeping it in browser
-- mocks. `scope` distinguishes academy-wide and user-specific documents.
CREATE TABLE "WorkspaceState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academyId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspaceState_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WorkspaceState_academyId_scope_feature_key" ON "WorkspaceState"("academyId", "scope", "feature");
CREATE INDEX "WorkspaceState_academyId_feature_idx" ON "WorkspaceState"("academyId", "feature");

CREATE TABLE "AccessScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academyId" TEXT NOT NULL,
    "studentId" TEXT,
    "scannedById" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "valid" BOOLEAN NOT NULL,
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccessScan_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AccessScan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AccessScan_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES "Teacher" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AccessScan_academyId_scannedAt_idx" ON "AccessScan"("academyId", "scannedAt");
CREATE INDEX "AccessScan_studentId_idx" ON "AccessScan"("studentId");
