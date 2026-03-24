'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import Modal from '@/components/Modal';

// ── Types ──────────────────────────────────────────────

type DocumentDetail = {
  id: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  size: number;
  status: string;
  type: string;
  createdAt: string;
  extractedData: {
    payload: Record<string, any>;
    confidence: number;
  } | null;
  auditLogs: {
    id: string;
    action: string;
    description: string | null;
    timestamp: string;
  }[];
};

// Field definitions per document type — label, key, input type, required
type FieldDef = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea';
  required?: boolean;
  placeholder?: string;
};

const FIELD_DEFS: Record<string, FieldDef[]> = {
  INVOICE: [
    { key: 'vendorName',    label: 'Vendor Name',     type: 'text',   required: true, placeholder: 'Company name' },
    { key: 'buyerName',     label: 'Buyer Name',      type: 'text',   placeholder: 'Buyer company' },
    { key: 'invoiceNumber', label: 'Invoice Number',   type: 'text',   placeholder: 'INV-0000' },
    { key: 'invoiceDate',   label: 'Invoice Date',     type: 'text',   required: true, placeholder: 'DD/MM/YYYY' },
    { key: 'totalAmount',   label: 'Total Amount',     type: 'number', required: true, placeholder: '0.00' },
    { key: 'currency',      label: 'Currency',          type: 'text',   placeholder: 'EUR' },
  ],
  CERTIFICATE: [
    { key: 'certificateType',   label: 'Certificate Type',   type: 'text', required: true, placeholder: 'e.g. Phytosanitary, Organic' },
    { key: 'certificateNumber', label: 'Certificate Number',  type: 'text', placeholder: 'CERT-0000' },
    { key: 'issuingAuthority',  label: 'Issuing Authority',   type: 'text', placeholder: 'Authority name' },
    { key: 'holderName',        label: 'Holder Name',         type: 'text', required: true, placeholder: 'Company name' },
    { key: 'issueDate',         label: 'Issue Date',           type: 'text', required: true, placeholder: 'DD/MM/YYYY' },
    { key: 'expiryDate',        label: 'Expiry Date',          type: 'text', placeholder: 'DD/MM/YYYY' },
    { key: 'productsCovered',   label: 'Products Covered',     type: 'text', placeholder: 'Products description' },
    { key: 'status',            label: 'Status',                type: 'text', placeholder: 'VALID / EXPIRED' },
  ],
  REPORT: [
    { key: 'reportTitle',    label: 'Report Title',     type: 'text',   required: true, placeholder: 'Title' },
    { key: 'reportNumber',   label: 'Report Number',    type: 'text',   placeholder: 'RPT-0000' },
    { key: 'authorOrLab',    label: 'Author / Lab',     type: 'text',   placeholder: 'Lab name' },
    { key: 'reportDate',     label: 'Report Date',      type: 'text',   required: true, placeholder: 'DD/MM/YYYY' },
    { key: 'subjectProduct', label: 'Subject Product',  type: 'text',   placeholder: 'Product / batch' },
    { key: 'conclusion',     label: 'Conclusion',        type: 'text',   placeholder: 'PASS / FAIL' },
  ],
  UNKNOWN: [
    { key: 'detectedType', label: 'Detected Type', type: 'text',     placeholder: 'INVOICE / CERTIFICATE / REPORT' },
    { key: 'title',        label: 'Title',         type: 'text',     placeholder: 'Document title' },
    { key: 'date',         label: 'Date',          type: 'text',     placeholder: 'DD/MM/YYYY' },
    { key: 'organization', label: 'Organization',  type: 'text',     placeholder: 'Company name' },
    { key: 'summary',      label: 'Summary',       type: 'textarea', placeholder: 'Brief summary' },
  ],
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:          'bg-gray-100 text-gray-600',
  PROCESSING:       'bg-blue-50 text-blue-600',
  REVIEW_REQUIRED:  'bg-yellow-50 text-yellow-700',
  VALIDATED:        'bg-green-50 text-green-700',
  REJECTED:         'bg-red-50 text-red-600',
  ERROR:            'bg-red-100 text-red-700',
};

const ACTION_COLORS: Record<string, string> = {
  UPLOAD:        'bg-blue-50 text-blue-600',
  AUTO_EXTRACT:  'bg-purple-50 text-purple-600',
  UPDATE_FIELD:  'bg-amber-50 text-amber-600',
  VALIDATE_DOC:  'bg-green-50 text-green-600',
  DELETE_DOC:    'bg-red-50 text-red-600',
};

// ── Component ──────────────────────────────────────────

export default function DocumentDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const { addToast } = useToast();

  const [doc, setDoc]               = useState<DocumentDetail | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Fetch document + presigned preview URL
  const loadDocument = useCallback(async () => {
    try {
      const res = await api.get(`/documents/${id}`);
      const data = res.data as DocumentDetail;
      setDoc(data);

      if (data.extractedData?.payload) {
        reset(data.extractedData.payload);
      }

      // Get presigned download URL for the preview panel
      if (data.storagePath) {
        const urlRes = await api.get('/storage/download-url', {
          params: { key: data.storagePath },
        });
        setPreviewUrl(urlRes.data.downloadUrl);
      }
    } catch {
      router.push('/documents');
    } finally {
      setLoading(false);
    }
  }, [id, router, reset]);

  useEffect(() => { loadDocument(); }, [loadDocument]);

  // Validate & Save
  async function onValidate(formData: Record<string, any>) {
    setSaving(true);
    setSaveMsg(null);
    try {
      const cleaned = { ...formData };
      if (cleaned.totalAmount) cleaned.totalAmount = parseFloat(cleaned.totalAmount);

      await api.patch(`/documents/${id}/data`, cleaned);
      addToast('Document validated and saved.', 'success');
      setSaveMsg(null);
      await loadDocument();
    } catch (err: any) {
      const detail = err.response?.data?.message;
      addToast(typeof detail === 'string' ? detail : 'Validation failed. Check your inputs.', 'error');
    } finally {
      setSaving(false);
    }
  }

  // Reject document via modal
  async function confirmReject() {
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.patch(`/documents/${id}/reject`, { reason: rejectReason || undefined });
      addToast('Document rejected.', 'success');
      setSaveMsg(null);
      setRejectOpen(false);
      setRejectReason('');
      await loadDocument();
    } catch {
      addToast('Failed to reject document.', 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Helpers ──

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  function formatTimestamp(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatAction(action: string) {
    return action.charAt(0) + action.slice(1).toLowerCase().replace(/_/g, ' ');
  }

  // ── Render ──

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>;
  }
  if (!doc) return null;

  const confidence = doc.extractedData?.confidence ?? 0;
  const payload    = doc.extractedData?.payload ?? {};
  const canEdit    = doc.status === 'REVIEW_REQUIRED';
  const hasData    = Object.keys(payload).length > 0;
  const fields     = FIELD_DEFS[doc.type] ?? FIELD_DEFS.UNKNOWN;
  const isPdf      = doc.mimeType === 'application/pdf';
  const isImage    = doc.mimeType.startsWith('image/');

  return (
    <div className="space-y-4">

      {/* ── BREADCRUMB + STATUS ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/documents" className="hover:text-blue-600 transition-colors">Documents</Link>
          <span>/</span>
          <span className="text-gray-800 font-medium truncate max-w-xs">{doc.originalName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {doc.status.replace(/_/g, ' ')}
          </span>
          {/* Confidence bar */}
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${confidence >= 80 ? 'bg-green-500' : confidence >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`}
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600">{confidence}%</span>
          </div>
        </div>
      </div>

      {/* ── MAIN SPLIT LAYOUT ── */}
      <div className="grid grid-cols-5 gap-4" style={{ height: 'calc(100vh - 220px)' }}>

        {/* Left: Document Preview — 3/5 */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-100 flex flex-col overflow-hidden">

          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{doc.originalName}</p>
                <p className="text-xs text-gray-400">{doc.mimeType} · {formatBytes(doc.size)} · {formatDate(doc.createdAt)}</p>
              </div>
            </div>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Open in new tab
              </a>
            )}
          </div>

          {/* Actual preview */}
          <div className="flex-1 bg-gray-50 overflow-hidden">
            {previewUrl && isPdf && (
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title="Document preview"
              />
            )}
            {previewUrl && isImage && (
              <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                <img
                  src={previewUrl}
                  alt={doc.originalName}
                  className="max-w-full max-h-full object-contain rounded"
                />
              </div>
            )}
            {!previewUrl && (
              <div className="flex-1 flex flex-col items-center justify-center h-full">
                <svg className="w-14 h-14 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-gray-400">Preview unavailable</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Extracted Data — 2/5 */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 flex flex-col overflow-hidden">

          <div className="px-5 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Extracted Data</h2>
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">{doc.type}</span>
            </div>
            {canEdit && (
              <p className="text-xs text-yellow-600 mt-0.5">Review and correct the fields below, then validate.</p>
            )}
            {!canEdit && doc.status === 'VALIDATED' && (
              <p className="text-xs text-green-600 mt-0.5">This document has been validated.</p>
            )}
            {!canEdit && doc.status !== 'VALIDATED' && doc.status !== 'REVIEW_REQUIRED' && (
              <p className="text-xs text-gray-400 mt-0.5">Fields are read-only for this status.</p>
            )}
          </div>

          <form onSubmit={handleSubmit(onValidate)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 px-5 py-4 space-y-3 overflow-y-auto">

              {/* Dynamic fields based on document type */}
              {hasData && fields.map((f) => (
                <Field key={f.key} label={f.label}>
                  {f.type === 'textarea' ? (
                    <textarea
                      {...register(f.key, f.required ? { required: 'Required' } : {})}
                      disabled={!canEdit}
                      className="field-input resize-none h-16"
                      placeholder={f.placeholder}
                    />
                  ) : (
                    <input
                      {...register(f.key, f.required ? { required: 'Required' } : {})}
                      type={f.type === 'number' ? 'number' : 'text'}
                      step={f.type === 'number' ? '0.01' : undefined}
                      disabled={!canEdit}
                      className="field-input"
                      placeholder={f.placeholder}
                    />
                  )}
                  {errors[f.key] && <FieldError msg={String(errors[f.key]?.message)} />}
                </Field>
              ))}

              {/* Line items (invoice only) */}
              {doc.type === 'INVOICE' && Array.isArray(payload.lineItems) && payload.lineItems.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-400 tracking-wide mb-2 block">LINE ITEMS</label>
                  <div className="space-y-2">
                    {payload.lineItems.map((item: any, i: number) => (
                      <div key={i} className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 flex justify-between">
                        <span className="text-gray-700">{item.description}</span>
                        <span className="text-gray-500 shrink-0 ml-2">
                          {item.quantity} x {item.unitPrice}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Report key findings */}
              {doc.type === 'REPORT' && Array.isArray(payload.keyFindings) && payload.keyFindings.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-400 tracking-wide mb-2 block">KEY FINDINGS</label>
                  <ul className="space-y-1">
                    {payload.keyFindings.map((finding: string, i: number) => (
                      <li key={i} className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-gray-700">
                        {finding}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* No data yet */}
              {!hasData && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <svg className="w-10 h-10 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm text-gray-400">No extracted data yet.</p>
                  <p className="text-xs text-gray-300 mt-1">
                    {doc.status === 'PROCESSING' ? 'AI is currently processing...' : 'Data will appear after AI extraction completes.'}
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons — only when REVIEW_REQUIRED */}
            {canEdit && hasData && (
              <div className="px-5 py-4 border-t border-gray-100 space-y-2">
                {saveMsg && (
                  <p className={`text-xs text-center mb-2 ${saveMsg.startsWith('Document validated') || saveMsg.startsWith('Document rejected') ? 'text-green-600' : 'text-red-500'}`}>
                    {saveMsg}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Validate & Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setRejectOpen(true)}
                  disabled={saving}
                  className="w-full py-2.5 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  Reject
                </button>
              </div>
            )}

            {/* Back button when not editable */}
            {!canEdit && (
              <div className="px-5 py-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => router.push('/documents')}
                  className="w-full py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to Documents
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* ── AUDIT LOG TIMELINE ── */}
      {doc.auditLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Activity Timeline</h2>
          <div className="space-y-3">
            {doc.auditLogs.map((log, i) => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                    {log.action === 'UPLOAD' && '↑'}
                    {log.action === 'AUTO_EXTRACT' && '⚙'}
                    {log.action === 'UPDATE_FIELD' && '✎'}
                    {log.action === 'VALIDATE_DOC' && '✓'}
                    {log.action === 'DELETE_DOC' && '✗'}
                    {!['UPLOAD', 'AUTO_EXTRACT', 'UPDATE_FIELD', 'VALIDATE_DOC', 'DELETE_DOC'].includes(log.action) && '•'}
                  </span>
                  {i < doc.auditLogs.length - 1 && (
                    <div className="w-px h-5 bg-gray-100 mt-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 font-medium">{formatAction(log.action)}</span>
                    <span className="text-xs text-gray-400">{formatTimestamp(log.timestamp)}</span>
                  </div>
                  {log.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{log.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reject confirmation modal */}
      <Modal open={rejectOpen} onClose={() => { setRejectOpen(false); setRejectReason(''); }} title="Reject Document">
        <p className="text-sm text-gray-600 mb-3">
          Are you sure you want to reject <span className="font-medium text-gray-800">{doc.originalName}</span>?
        </p>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason for rejection (optional)"
          className="field-input resize-none h-20 mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={() => { setRejectOpen(false); setRejectReason(''); }}
            className="flex-1 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmReject}
            disabled={saving}
            className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ── Helper Components ──────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-400 tracking-wide mb-1 block">{label.toUpperCase()}</label>
      {children}
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="mt-1 text-xs text-red-500">{msg}</p>;
}
