-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "newValue" JSONB,
ADD COLUMN     "oldValue" JSONB;
