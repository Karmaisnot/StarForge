ALTER TABLE "Cohort" ADD COLUMN "progressionMode" TEXT NOT NULL DEFAULT 'level';
ALTER TABLE "Cohort" ADD COLUMN "currentMonth" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "CohortInstructor" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cohortId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CohortInstructor_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CohortInstructor_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CohortLesson" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cohortId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "title" JSONB NOT NULL,
  "type" TEXT NOT NULL,
  "room" JSONB NOT NULL,
  "startsAt" DATETIME NOT NULL,
  "endsAt" DATETIME NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CohortLesson_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CohortLesson_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "CohortHomework" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "title" JSONB NOT NULL,
  "dueAt" DATETIME NOT NULL,
  "submitted" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CohortHomework_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CohortLesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CohortProgression" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cohortId" TEXT NOT NULL,
  "advancedById" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "fromValue" JSONB NOT NULL,
  "toValue" JSONB NOT NULL,
  "readiness" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CohortProgression_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CohortProgression_advancedById_fkey" FOREIGN KEY ("advancedById") REFERENCES "Teacher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CohortInstructor_cohortId_teacherId_role_key" ON "CohortInstructor"("cohortId", "teacherId", "role");
CREATE INDEX "CohortInstructor_cohortId_position_idx" ON "CohortInstructor"("cohortId", "position");
CREATE INDEX "CohortInstructor_teacherId_idx" ON "CohortInstructor"("teacherId");
CREATE INDEX "CohortLesson_cohortId_startsAt_idx" ON "CohortLesson"("cohortId", "startsAt");
CREATE INDEX "CohortLesson_teacherId_idx" ON "CohortLesson"("teacherId");
CREATE UNIQUE INDEX "CohortHomework_lessonId_key" ON "CohortHomework"("lessonId");
CREATE INDEX "CohortProgression_cohortId_createdAt_idx" ON "CohortProgression"("cohortId", "createdAt");
CREATE INDEX "CohortProgression_advancedById_idx" ON "CohortProgression"("advancedById");
