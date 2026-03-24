-- CreateIndex
CREATE INDEX "AuditLog_userId_timestamp_idx" ON "AuditLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_documentId_timestamp_idx" ON "AuditLog"("documentId", "timestamp");

-- CreateIndex
CREATE INDEX "Document_userId_deletedAt_status_idx" ON "Document"("userId", "deletedAt", "status");

-- CreateIndex
CREATE INDEX "Document_userId_deletedAt_type_idx" ON "Document"("userId", "deletedAt", "type");

-- CreateIndex
CREATE INDEX "Document_userId_deletedAt_createdAt_idx" ON "Document"("userId", "deletedAt", "createdAt");
