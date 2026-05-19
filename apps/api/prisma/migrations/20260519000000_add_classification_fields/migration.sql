-- AlterTable
ALTER TABLE "Document"
ADD COLUMN     "detectedType" "DocumentType",
ADD COLUMN     "classificationConfidence" DOUBLE PRECISION;
