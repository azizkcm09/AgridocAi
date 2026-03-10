'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';

// Full document shape returned by GET /documents/:id
type DocumentDetail = {
  id: string;
  originalName: string;
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
    description: string;
    timestamp: string;
  }[];
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:          'bg-gray-100 text-gray-600',
  PROCESSING:       'bg-blue-50 text-blue-600',
  REVIEW_REQUIRED:  'bg-yellow-50 text-yellow-700',
  VALIDATED:        'bg-green-50 text-green-700',
  REJECTED:         'bg-red-50 text-red-600',
  ERROR:            'bg-red-100 text-red-700',
};

export default function DocumentDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [doc, setDoc]         = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // react-hook-form — manages the editable extracted data fields
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Fetch document on load
  useEffect(() => {
    api.get(`/documents/${id}`)
      .then((res) => {
        setDoc(res.data);
        // Pre-fill the form with existing extracted data
        if (res.data.extractedData?.payload) {
          reset(res.data.extractedData.payload);
        }
      })
      .catch(() => router.push('/documents'))
      .finally(() => setLoading(false));
  }, [id, router, reset]);

  // Called when user clicks "Validate & Save"
  async function onValidate(formData: Record<string, any>) {
    setSaving(true);
    setSaveMsg(null);
    try {
      // Convert totalAmount to a number — HTML inputs always return strings
      const payload = {
        ...formData,
        totalAmount: formData.totalAmount ? parseFloat(formData.totalAmount) : undefined,
      };
      await api.patch(`/documents/${id}/data`, payload);
      setSaveMsg('✓ Document validated and saved.');
      // Refresh to show updated status
      const res = await api.get(`/documents/${id}`);
      setDoc(res.data);
    } catch (err: any) {
      const detail = err.response?.data?.message;
      setSaveMsg(typeof detail === 'string' ? detail : 'Validation failed. Check your inputs.');
    } finally {
      setSaving(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>;
  }

  if (!doc) return null;

  const confidence  = doc.extractedData?.confidence ?? 0;
  const payload     = doc.extractedData?.payload ?? {};
  const isInvoice   = doc.type === 'INVOICE';
  const canEdit     = doc.status === 'REVIEW_REQUIRED';

  return (
    <div className="space-y-4">

      {/* ── BREADCRUMB + STATUS ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/documents" className="hover:text-blue-600 transition-colors">
            Documents
          </Link>
          <span>/</span>
          <span className="text-gray-800 font-medium truncate max-w-xs">{doc.originalName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {doc.status.replace(/_/g, ' ')}
          </span>
          <span className="text-sm text-gray-500">
            Overall Confidence: <span className="font-semibold text-gray-800">{confidence}%</span>
          </span>
        </div>
      </div>

      {/* ── MAIN SPLIT LAYOUT ── */}
      <div className="grid grid-cols-5 gap-4">

        {/* Left: Document Preview — 3/5 width */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-100 flex flex-col overflow-hidden">

          {/* File info header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{doc.originalName}</p>
              <p className="text-xs text-gray-400">{doc.mimeType} · {formatBytes(doc.size)} · {formatDate(doc.createdAt)}</p>
            </div>
          </div>

          {/* Preview area */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
            <svg className="w-16 h-16 text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium text-gray-400">Document Preview</p>
            <p className="text-xs text-gray-400 mt-1">{doc.originalName}</p>
          </div>
        </div>

        {/* Right: Extracted Data Panel — 2/5 width */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 flex flex-col">

          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Extracted Data</h2>
            {!canEdit && doc.status === 'VALIDATED' && (
              <p className="text-xs text-green-600 mt-0.5">This document has been validated.</p>
            )}
            {!canEdit && doc.status !== 'VALIDATED' && (
              <p className="text-xs text-gray-400 mt-0.5">Fields are read-only for this status.</p>
            )}
          </div>

          <form onSubmit={handleSubmit(onValidate)} className="flex-1 flex flex-col">
            <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">

              {/* INVOICE fields */}
              {isInvoice && (
                <>
                  <Field label="VENDOR NAME" confidence={confidence}>
                    <input
                      {...register('vendorName', { required: 'Required' })}
                      disabled={!canEdit}
                      className="field-input"
                      placeholder="Vendor name"
                    />
                    {errors.vendorName && <FieldError msg={String(errors.vendorName.message)} />}
                  </Field>

                  <Field label="TOTAL AMOUNT" confidence={confidence}>
                    <input
                      {...register('totalAmount', { required: 'Required' })}
                      type="number"
                      step="0.01"
                      disabled={!canEdit}
                      className="field-input"
                      placeholder="0.00"
                    />
                    {errors.totalAmount && <FieldError msg={String(errors.totalAmount.message)} />}
                  </Field>

                  <Field label="INVOICE DATE" confidence={confidence}>
                    <input
                      {...register('invoiceDate')}
                      disabled={!canEdit}
                      className="field-input"
                      placeholder="DD/MM/YYYY"
                    />
                  </Field>

                  <Field label="CURRENCY" confidence={confidence}>
                    <input
                      {...register('currency')}
                      disabled={!canEdit}
                      className="field-input"
                      placeholder="EUR"
                      maxLength={3}
                    />
                  </Field>
                </>
              )}

              {/* Non-invoice: show raw payload as read-only */}
              {!isInvoice && Object.keys(payload).length > 0 && (
                Object.entries(payload).map(([key, val]) => (
                  <Field key={key} label={key.toUpperCase()} confidence={confidence}>
                    <input
                      defaultValue={String(val)}
                      disabled
                      className="field-input"
                    />
                  </Field>
                ))
              )}

              {/* No data yet */}
              {!isInvoice && Object.keys(payload).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No extracted data available.</p>
              )}

            </div>

            {/* Validate & Reject buttons — only shown when REVIEW_REQUIRED */}
            {canEdit && (
              <div className="px-5 py-4 border-t border-gray-100 space-y-2">
                {saveMsg && (
                  <p className={`text-xs text-center mb-2 ${saveMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
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
                  onClick={() => router.push('/documents')}
                  className="w-full py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Reject
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Small helper components ──

function Field({ label, confidence, children }: {
  label: string;
  confidence: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-gray-400 tracking-wide">{label}</label>
        <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
          {confidence}
        </span>
      </div>
      {children}
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="mt-1 text-xs text-red-500">{msg}</p>;
}
