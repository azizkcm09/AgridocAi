/*
  Warnings:

  - The values [EXTRACTION_START,EXTRACTION_SUCCESS,EXTRACTION_FAILED,VALIDATION,DELETE] on the enum `AuditAction` will be removed. If these variants are still used in the database, this will fail.
  - The values [READY_FOR_REVIEW] on the enum `DocumentStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('INVOICE', 'CERTIFICATE', 'REPORT', 'UNKNOWN');

-- AlterEnum
BEGIN;
CREATE TYPE "AuditAction_new" AS ENUM ('UPLOAD', 'AUTO_EXTRACT', 'UPDATE_FIELD', 'VALIDATE_DOC', 'DELETE_DOC', 'EXPORT');
ALTER TABLE "AuditLog" ALTER COLUMN "action" TYPE "AuditAction_new" USING ("action"::text::"AuditAction_new");
ALTER TYPE "AuditAction" RENAME TO "AuditAction_old";
ALTER TYPE "AuditAction_new" RENAME TO "AuditAction";
DROP TYPE "public"."AuditAction_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "DocumentStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'REVIEW_REQUIRED', 'VALIDATED', 'REJECTED', 'ERROR');
ALTER TABLE "public"."Document" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Document" ALTER COLUMN "status" TYPE "DocumentStatus_new" USING ("status"::text::"DocumentStatus_new");
ALTER TYPE "DocumentStatus" RENAME TO "DocumentStatus_old";
ALTER TYPE "DocumentStatus_new" RENAME TO "DocumentStatus";
DROP TYPE "public"."DocumentStatus_old";
ALTER TABLE "Document" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "type" "DocumentType" NOT NULL DEFAULT 'UNKNOWN';
