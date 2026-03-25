import { z } from 'zod';
import { DocumentType } from '@prisma/client';

// All fields are nullable — missing fields are allowed as long as the user
// explicitly marks them as N/A via fieldOverrides before validation.

// --- INVOICE schema ---
export const InvoiceSchema = z.object({
  vendorName: z.string().min(1).nullable().optional(),
  buyerName: z.string().nullable().optional(),
  invoiceNumber: z.string().nullable().optional(),
  invoiceDate: z.string().nullable().optional(),
  totalAmount: z.number().min(0).nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
  lineItems: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
      }),
    )
    .nullable()
    .optional(),
});

// --- CERTIFICATE schema ---
export const CertificateSchema = z.object({
  certificateType: z.string().min(1).nullable().optional(),
  certificateNumber: z.string().nullable().optional(),
  issuingAuthority: z.string().nullable().optional(),
  holderName: z.string().min(1).nullable().optional(),
  issueDate: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  productsCovered: z.string().nullable().optional(),
  status: z.string().nullable().optional().transform((v) => v?.toUpperCase() ?? v),
});

// --- REPORT schema ---
export const ReportSchema = z.object({
  reportTitle: z.string().min(1).nullable().optional(),
  reportNumber: z.string().nullable().optional(),
  authorOrLab: z.string().nullable().optional(),
  reportDate: z.string().nullable().optional(),
  subjectProduct: z.string().nullable().optional(),
  conclusion: z.string().nullable().optional(),
  keyFindings: z.array(z.string()).nullable().optional(),
});

// --- UNKNOWN fallback schema ---
export const UnknownSchema = z.object({
  detectedType: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  organization: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
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

// Fields that were originally "required" per document type — these must be
// either filled (non-null) or explicitly marked as N/A before validation.
export const REQUIRED_FIELDS: Record<string, string[]> = {
  INVOICE: ['vendorName', 'invoiceDate', 'totalAmount'],
  CERTIFICATE: ['certificateType', 'holderName', 'issueDate'],
  REPORT: ['reportTitle', 'reportDate'],
  UNKNOWN: [],
};
