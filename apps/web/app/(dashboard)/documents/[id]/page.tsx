'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';

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
    description: string | null;
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

const ACTION_COLORS: Record<string, string> = {
  UPLOAD:        'bg-blue-50 text-blue-600',
  AUTO_EXTRACT:  'bg-purple-50 text-purple-600',
  UPDATE_FIELD:  'bg-amber-50 text-amber-600',
  VALIDATE_DOC:  'bg-green-50 text-green-600',
  DELETE_DOC:    'bg-red-50 text-red-600',
};

export default function DocumentDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [doc, setDoc]         = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    api.get(`/documents/${id}`)
      .then((res) => {
        setDoc(res.data);
        if (res.data.extractedData?.payload) {
          reset(res.data.extractedData.payload);
        }
      })
      .catch(() => router.push('/documents'))
      .finally(() => setLoading(false));
  }, [id, router, reset]);

  async function onValidate(formData: Record<string, any>) {
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload = {
        ...formData,
        totalAmount: formData.totalAmount ? parseFloat(formData.totalAmount) : undefined,
      };
      await api.patch(`/documents/${id}/data`, payload);
      setSaveMsg('Document validated and saved.');
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

  function formatTimestamp(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short',
    }) + ' ' + d.toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit',
    });
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatAction(action: string) {
    return action.charAt(0) + action.slice(1).toLowerCase().replace(/_/g, ' ');
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>;
  }

  if (!doc) return null;

  const confidence  = doc.extractedData?.confidence ?? 0;
  const payload     = doc.extractedData?.payload ?? {};
  const isInvoice   = doc.type === 'INVOICE';
  const canEdit     = doc.status === 'REVIEW_REQUIRED';
  const hasData     = Object.keys(payload).length > 0;

  return (
    <div className="space-y-4">

      {/* -- BREADCRUMB + STATUS -- */}
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
            Confidence: <span className="font-semibold text-gray-800">{confidence}%</span>
          </span>
        </div>
      </div>

      {/* -- MAIN SPLIT LAYOUT -- */}
      <div className="grid grid-cols-5 gap-4">

        {/* Left: Document Preview -- 3/5 width */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-100 flex flex-col overflow-hidden">

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

          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
            <svg className="w-16 h-16 text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium text-gray-400">Document Preview</p>
            <p className="text-xs text-gray-400 mt-1">{doc.originalName}</p>
          </div>
        </div>

        {/* Right: Extracted Data Panel -- 2/5 width */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 flex flex-col">

          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Extracted Data</h2>
            {!canEdit && doc.status === 'VALIDATED' && (
              <p className="text-xs text-green-600 mt-0.5">This document has been validated.</p>
            )}
            {canEdit && (
              <p className="text-xs text-yellow-600 mt-0.5">Review the fields below and validate or correct them.</p>
            )}
            {!canEdit && doc.status !== 'VALIDATED' && doc.status !== 'REVIEW_REQUIRED' && (
              <p className="text-xs text-gray-400 mt-0.5">Fields are read-only for this status.</p>
            )}
          </div>

          <form onSubmit={handleSubmit(onValidate)} className="flex-1 flex flex-col">
            <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">

              {/* INVOICE fields */}
              {isInvoice && hasData && (
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
              {!isInvoice && hasData && (
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

              {/* No data yet — shown for any doc type */}
              {!hasData && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <svg className="w-10 h-10 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm text-gray-400">No extracted data yet.</p>
                  <p className="text-xs text-gray-300 mt-1">
                    {doc.status === 'PROCESSING' ? 'AI is currently processing this document...' : 'Data will appear after AI extraction completes.'}
                  </p>
                </div>
              )}

            </div>

            {/* Validate & Reject buttons -- only shown when REVIEW_REQUIRED */}
            {canEdit && hasData && (
              <div className="px-5 py-4 border-t border-gray-100 space-y-2">
                {saveMsg && (
                  <p className={`text-xs text-center mb-2 ${saveMsg.startsWith('Document validated') ? 'text-green-600' : 'text-red-500'}`}>
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
                  Back to Documents
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* -- AUDIT LOG TIMELINE -- */}
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
    </div>
  );
}

// -- Small helper components --

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
          {confidence}%
        </span>
      </div>
      {children}
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="mt-1 text-xs text-red-500">{msg}</p>;
}
