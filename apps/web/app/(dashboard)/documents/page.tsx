'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import api from '@/lib/api';
import fetcher from '@/lib/fetcher';
import { useToast } from '@/lib/toast-context';
import Modal from '@/components/Modal';
import { TableRowSkeleton } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import StatusBadge from '@/components/StatusBadge';

type Document = {
  id: string;
  originalName: string;
  type: string;
  status: string;
  createdAt: string;
  detectedType?: string | null;
  classificationConfidence?: number | null;
};

// Color buckets shown next to the AI-detected document type. Mirrors the
// thresholds used on the document detail page so the visual language is
// consistent between the list and the detail.
function confidenceBucket(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  if (value >= 85) return { tone: 'high', label: `${Math.round(value)}%`, cls: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' };
  if (value >= 60) return { tone: 'mid',  label: `${Math.round(value)}%`, cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' };
  return { tone: 'low', label: `${Math.round(value)}%`, cls: 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' };
}

const PAGE_SIZE = 8;

// Build the SWR key from current filters
function buildKey(page: number, search: string, type: string, status: string) {
  const params = new URLSearchParams();
  params.set('page',  String(page));
  params.set('limit', String(PAGE_SIZE));
  if (search)          params.set('search', search);
  if (type   !== 'ALL') params.set('type',   type);
  if (status !== 'ALL') params.set('status', status);
  return `/documents?${params.toString()}`;
}

export default function DocumentsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch]             = useState(searchParams.get('search') ?? '');
  const [typeFilter, setTypeFilter]     = useState('ALL');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'ALL');
  const [page, setPage]                 = useState(1);

  const { addToast } = useToast();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Each batch action that has lasting consequences (reject / delete) goes
  // through a confirmation modal. The non-destructive ones (validate / export)
  // run immediately because they can be undone or are read-only.
  type BatchAction = 'reject' | 'delete';
  const [batchConfirm, setBatchConfirm] = useState<BatchAction | null>(null);
  const [batchReason, setBatchReason] = useState('');

  // ── Batch selection state ──
  //   - Cleaner add/delete API
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Track if a batch operation is in progress (disables buttons to prevent double-clicks)
  const [batchLoading, setBatchLoading] = useState(false);

  // SWR: fetch documents with caching per filter combination.
  // Poll every 3s while any row is still PENDING/PROCESSING so the user sees
  // status flip to REVIEW_REQUIRED without a manual refresh.
  const swrKey = buildKey(page, search, typeFilter, statusFilter);
  const { data, isLoading, error, mutate } = useSWR<{ data: Document[]; total: number }>(swrKey, fetcher, {
    refreshInterval: (latest) => {
      const rows = latest?.data ?? [];
      const inFlight = rows.some((d) => d.status === 'PENDING' || d.status === 'PROCESSING');
      return inFlight ? 3000 : 0;
    },
  });

  const documents = data?.data ?? [];
  const total     = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenu]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }
  function handleTypeChange(value: string) {
    setTypeFilter(value);
    setPage(1);
  }
  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/documents/${deleteTarget.id}`);
      setDeleteTarget(null);
      mutate();
    } catch {
      // keep modal open so user sees something went wrong
    } finally {
      setDeleting(false);
    }
  }

  async function handleExport(doc: Document) {
    setOpenMenu(null);
    try {
      const res = await api.get(`/documents/${doc.id}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agridoc-report-${doc.id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      addToast('PDF exported successfully.', 'success');
    } catch {
      addToast('Failed to export PDF.', 'error');
    }
  }

  // ── Selection helpers ──


  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);       // Clone the Set (new reference)
      if (next.has(id)) next.delete(id); // Toggle: remove if present
      else next.add(id);                 // Toggle: add if absent
      return next;
    });
  }


  const allSelected = documents.length > 0 && documents.every((d) => selectedIds.has(d.id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set()); // Deselect everything
    } else {
      setSelectedIds(new Set(documents.map((d) => d.id))); // Select all on page
    }
  }

  // ── Batch action handlers ──

  async function handleBatchValidate() {
    setBatchLoading(true);
    try {
      const ids = Array.from(selectedIds);  // Convert Set to array for JSON
      const res = await api.post('/documents/batch/validate', { documentIds: ids });
      setSelectedIds(new Set());
      mutate();
      addToast(`${res.data.validated} document(s) validated.`, 'success');
    } catch {
      addToast('Batch validate failed.', 'error');
    } finally {
      setBatchLoading(false);
    }
  }

  async function performBatchReject(reason: string) {
    setBatchLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await api.post('/documents/batch/reject', {
        documentIds: ids,
        reason: reason || undefined,
      });
      setSelectedIds(new Set());
      setBatchConfirm(null);
      setBatchReason('');
      mutate();
      addToast(`${res.data.rejected} document(s) rejected.`, 'success');
    } catch {
      addToast('Batch reject failed.', 'error');
    } finally {
      setBatchLoading(false);
    }
  }

  async function performBatchDelete() {
    setBatchLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await api.post('/documents/batch/delete', { documentIds: ids });
      setSelectedIds(new Set());
      setBatchConfirm(null);
      mutate();
      addToast(`${res.data.deleted} document(s) deleted.`, 'success');
    } catch {
      addToast('Batch delete failed.', 'error');
    } finally {
      setBatchLoading(false);
    }
  }

  /**
   * handleBatchExport — downloads a combined PDF.
   */
  async function handleBatchExport() {
    setBatchLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await api.post('/documents/batch/export', { documentIds: ids }, {
        responseType: 'blob',  // Tell Axios: "this response is binary, not JSON"
      });
      // Create a temporary object URL from the PDF blob
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');   // Create invisible <a> tag
      a.href = url;
      a.download = `agridoc-batch-export.pdf`;  // Suggested filename
      a.click();                                // Trigger the download
      window.URL.revokeObjectURL(url);          // Free memory
      setSelectedIds(new Set());
      addToast('Batch PDF exported.', 'success');
    } catch {
      addToast('Batch export failed. Make sure selected documents are validated.', 'error');
    } finally {
      setBatchLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  }

  function dropdownPosition(index: number) {
    const isNearBottom = index >= documents.length - 2;
    return isNearBottom ? 'bottom-10' : 'top-10';
  }

  return (
    <div className="space-y-4">

      <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[color:var(--foreground)]">Documents</h1>

      {/* -- FILTERS -- */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">

        <div className="relative flex-1 sm:max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by filename..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        >
          <option value="ALL">Type: All</option>
          <option value="INVOICE">Invoice</option>
          <option value="CERTIFICATE">Certificate</option>
          <option value="REPORT">Report</option>
          <option value="UNKNOWN">Unknown</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        >
          <option value="ALL">Status: All</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="REVIEW_REQUIRED">Review Required</option>
          <option value="VALIDATED">Validated</option>
          <option value="REJECTED">Rejected</option>
          <option value="ERROR">Error</option>
        </select>
      </div>

      {/* -- BATCH TOOLBAR --
          Only visible when at least 1 document is selected.
          Shows: count label, action buttons, clear button.
          All buttons are disabled while a batch operation is in progress
          (batchLoading) to prevent double-clicks sending duplicate requests.
      */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg px-4 py-2.5">
          {/* Count label */}
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {selectedIds.size} selected
          </span>

          {/* Divider line between count and buttons */}
          <div className="h-5 w-px bg-indigo-200 dark:bg-indigo-700" />

          {/* Validate All — only makes sense if at least some are REVIEW_REQUIRED */}
          <button
            onClick={handleBatchValidate}
            disabled={batchLoading}
            className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 disabled:opacity-50 transition-colors"
          >
            Validate All
          </button>
          <button
            onClick={() => { setBatchReason(''); setBatchConfirm('reject'); }}
            disabled={batchLoading}
            className="text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 disabled:opacity-50 transition-colors"
          >
            Reject All
          </button>
          <button
            onClick={handleBatchExport}
            disabled={batchLoading}
            className="text-sm font-medium text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:opacity-50 transition-colors"
          >
            Export All
          </button>
          <button
            onClick={() => setBatchConfirm('delete')}
            disabled={batchLoading}
            className="text-sm font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 disabled:opacity-50 transition-colors"
          >
            Delete All
          </button>

          {/* Spacer pushes the clear button to the right */}
          <div className="flex-1" />

          {/* Clear selection — resets the Set to empty */}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* -- CARD LIST (below md) -- */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-lg ring-1 ring-slate-900/5 dark:ring-slate-800 p-4 animate-pulse">
              <div className="h-4 bg-slate-200/60 dark:bg-slate-700/50 rounded w-2/3 mb-3" />
              <div className="h-3 bg-slate-200/60 dark:bg-slate-700/50 rounded w-1/3" />
            </div>
          ))
        ) : error ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg ring-1 ring-slate-900/5 dark:ring-slate-800">
            <ErrorState
              title="Could not load documents"
              description="The server is unreachable or returned an error."
              onRetry={() => mutate()}
            />
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg ring-1 ring-slate-900/5 dark:ring-slate-800">
            <EmptyState
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              title="No documents yet"
              description="Upload your first document to get started."
              action={{ label: 'Upload Document', onClick: () => router.push('/upload') }}
            />
          </div>
        ) : (
          documents.map((doc) => {
            const bucket = confidenceBucket(doc.classificationConfidence);
            const isSelected = selectedIds.has(doc.id);
            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-900 rounded-lg ring-1 ring-slate-900/5 dark:ring-slate-800 p-4 flex gap-3 active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOne(doc.id)}
                  className="mt-1 rounded border-slate-300 dark:border-slate-600 text-[color:var(--brand)] focus:ring-[color:var(--brand)]"
                />
                <button
                  type="button"
                  onClick={() => router.push(`/documents/${doc.id}`)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-sm font-medium text-[color:var(--foreground)] truncate">
                    {doc.originalName}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[color:var(--foreground-muted)]">
                    <span className="capitalize">{doc.type.charAt(0) + doc.type.slice(1).toLowerCase()}</span>
                    {bucket && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${bucket.cls}`}>
                        {bucket.label}
                      </span>
                    )}
                    <span>·</span>
                    <span>{formatDate(doc.createdAt)}</span>
                  </div>
                  <div className="mt-2">
                    <StatusBadge status={doc.status} />
                  </div>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* -- TABLE (md and up) -- */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 overflow-visible">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
              {/* Checkbox column header — "select all" toggle for current page.
                  The "checked" state uses the allSelected variable we computed above.
                  onChange fires toggleAll() which either selects all or deselects all. */}
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Document Name</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Upload Date</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide w-16">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
            ) : error ? (
              <tr>
                <td colSpan={6}>
                  <ErrorState
                    title="Could not load documents"
                    description="The server is unreachable or returned an error. You can retry without losing your filters."
                    onRetry={() => mutate()}
                  />
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                    title="No documents yet"
                    description="Upload your first document to get started."
                    action={{ label: 'Upload Document', onClick: () => router.push('/upload') }}
                  />
                </td>
              </tr>
            ) : (
              documents.map((doc, index) => (
                <tr
                  key={doc.id}
                  onClick={() => router.push(`/documents/${doc.id}`)}
                  className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  {/* Per-row checkbox.
                      e.stopPropagation() prevents the row's onClick from firing
                      when the user clicks the checkbox (otherwise clicking the
                      checkbox would also navigate to the document detail page).
                      selectedIds.has(doc.id) checks if this doc is in the Set. */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(doc.id)}
                      onChange={() => toggleOne(doc.id)}
                      className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400 font-medium max-w-xs truncate">
                    {doc.originalName}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="capitalize">
                        {doc.type.charAt(0) + doc.type.slice(1).toLowerCase()}
                      </span>
                      {(() => {
                        const bucket = confidenceBucket(doc.classificationConfidence);
                        if (!bucket) return null;
                        return (
                          <span
                            title={`AI classification confidence: ${bucket.label}`}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${bucket.cls}`}
                          >
                            {bucket.label}
                          </span>
                        );
                      })()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-4 py-3 relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenMenu(openMenu === doc.id ? null : doc.id)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      ⋮
                    </button>

                    {openMenu === doc.id && (
                      <div
                        ref={menuRef}
                        className={`absolute right-4 ${dropdownPosition(index)} z-20 bg-white dark:bg-slate-900 rounded-lg shadow-xl ring-1 ring-slate-900/5 dark:ring-slate-700 w-36 py-1`}
                      >
                        <button
                          onClick={() => { setOpenMenu(null); router.push(`/documents/${doc.id}`); }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          View
                        </button>
                        {doc.status === 'REVIEW_REQUIRED' && (
                          <button
                            onClick={() => { setOpenMenu(null); router.push(`/documents/${doc.id}`); }}
                            className="w-full text-left px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                          >
                            Validate
                          </button>
                        )}
                        {doc.status === 'VALIDATED' && (
                          <button
                            onClick={() => handleExport(doc)}
                            className="w-full text-left px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                          >
                            Export
                          </button>
                        )}
                        <button
                          onClick={() => { setOpenMenu(null); setDeleteTarget(doc); }}
                          className="w-full text-left px-4 py-2 text-sm text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Batch destructive-action confirmation */}
      <Modal
        open={batchConfirm !== null}
        onClose={() => { setBatchConfirm(null); setBatchReason(''); }}
        title={batchConfirm === 'reject' ? 'Reject Documents' : 'Delete Documents'}
      >
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
          {batchConfirm === 'reject'
            ? `Reject ${selectedIds.size} document(s)?`
            : `Permanently remove ${selectedIds.size} document(s) from your list?`}
        </p>
        <p className="text-xs text-slate-400 mb-4">
          {batchConfirm === 'reject'
            ? 'Only documents in REVIEW REQUIRED status will be affected. Validated or already-rejected docs are skipped.'
            : 'The documents are soft-deleted — they disappear from your list but audit logs are kept.'}
        </p>
        {batchConfirm === 'reject' && (
          <textarea
            value={batchReason}
            onChange={(e) => setBatchReason(e.target.value)}
            placeholder="Reason (optional, recorded in audit trail)"
            className="field-input resize-none h-20 mb-4"
          />
        )}
        <div className="flex gap-3">
          <button
            onClick={() => { setBatchConfirm(null); setBatchReason(''); }}
            disabled={batchLoading}
            className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (batchConfirm === 'reject') performBatchReject(batchReason);
              else performBatchDelete();
            }}
            disabled={batchLoading}
            className={`flex-1 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors ${
              batchConfirm === 'reject'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {batchLoading ? 'Working…' : batchConfirm === 'reject' ? 'Reject all' : 'Delete all'}
          </button>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Document">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
          Are you sure you want to delete <span className="font-medium text-slate-800 dark:text-slate-200">{deleteTarget?.originalName}</span>?
        </p>
        <p className="text-xs text-slate-400 mb-5">This document will be removed from your list. Audit logs are preserved.</p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteTarget(null)}
            className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            disabled={deleting}
            className="flex-1 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>Page {page} of {totalPages} · {total} total</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
