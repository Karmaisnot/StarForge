-- Temporary credentials are blocked from every workspace endpoint until the
-- account holder chooses a permanent password.
ALTER TABLE "Teacher" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
