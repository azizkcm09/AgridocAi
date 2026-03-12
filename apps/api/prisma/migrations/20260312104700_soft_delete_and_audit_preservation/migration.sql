-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_documentId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "documentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
