import { z } from 'zod';
import { DocumentType } from '@prisma/client';

// --- INVOICE schema ---
// Matches the fields extracted by the LLM in apps/ai/app/prompts.py → invoice_prompt()
export const InvoiceSchema = z.object({
  vendorName: z.string().min(1, 'Vendor name is required'),
  buyerName: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string(),
  totalAmount: z.number().min(0, 'Amount cannot be negative'),
  currency: z.string().length(3).optional(),
  lineItems: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
      }),
    )
    .optional(),
});

// --- CERTIFICATE schema ---
// Matches: prompts.py → certificate_prompt()
export const CertificateSchema = z.object({
  certificateType: z.string().min(1, 'Certificate type is required'),
  certificateNumber: z.string().optional(),
  issuingAuthority: z.string().optional(),
  holderName: z.string().min(1, 'Holder name is required'),
  issueDate: z.string(),
  expiryDate: z.string().optional(),
  productsCovered: z.string().optional(),
  status: z.enum(['VALID', 'EXPIRED', 'SUSPENDED']).optional(),
});

// --- REPORT schema ---
// Matches: prompts.py → report_prompt()
export const ReportSchema = z.object({
  reportTitle: z.string().min(1, 'Report title is required'),
  reportNumber: z.string().optional(),
  authorOrLab: z.string().optional(),
  reportDate: z.string(),
  subjectProduct: z.string().optional(),
  conclusion: z.string().optional(),
  keyFindings: z.array(z.string()).optional(),
});

// --- UNKNOWN fallback schema ---
export const UnknownSchema = z.object({
  detectedType: z.string().optional(),
  title: z.string().optional(),
  date: z.string().optional(),
  organization: z.string().optional(),
  summary: z.string().optional(),
});

// Factory function — returns the right schema for HITL validation
export function getPayloadSchema(type: DocumentType) {
  switch (type) {
    case DocumentType.INVOICE:
      return InvoiceSchema;
    case DocumentType.CERTIFICATE:
      return CertificateSchema;
    case DocumentType.REPORT:
      return ReportSchema;
    default:
      return UnknownSchema;
  }
}
