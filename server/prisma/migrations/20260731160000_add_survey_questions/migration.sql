ALTER TABLE "SurveyResponse" ADD COLUMN "answers" JSONB;

CREATE TABLE "SurveyQuestion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "surveyId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "prompt" JSONB NOT NULL,
  "description" JSONB,
  "options" JSONB,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "SurveyQuestion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SurveyQuestion_surveyId_position_idx" ON "SurveyQuestion"("surveyId", "position");
