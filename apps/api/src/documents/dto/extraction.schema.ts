import { z } from 'zod';
import { DocumentType } from '@prisma/client';

// 1. Define the Invoice Schema
export const InvoiceSchema = z.object({
  vendorName: z.string().min(1, 'Vendor name is required'),
  totalAmount: z.number().min(0, 'Amount cannot be negative'),
  invoiceDate: z.string(), 
  currency: z.string().length(3).optional(),
});

// 2. Factory function to get the right schema based on document type
export function getPayloadSchema(type: DocumentType) {
  switch (type) {
    case DocumentType.INVOICE:
      return InvoiceSchema;
    // Add CERTIFICATE or REPORT schemas here later
    default:
      return z.any(); // Fallback
  }
}