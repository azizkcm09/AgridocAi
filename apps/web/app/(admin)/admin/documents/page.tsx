'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { TableRowSkeleton } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';

type Document = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: string;
  type: string;
  createdAt: string;
  user: { email: string; name: string | null };
  extractedData: { confidence: number } | null;
};

const STATUS_STYLES: Record<string, string> = {
  PENDING:         'bg-slate-100 text-slate-600',
  PROCESSING:      'bg-sky-50 text-sky-700',
  REVIEW_REQUIRED: 'bg-amber-50 text-amber-700',
  VALIDATED:       'bg-emerald-50 text-emerald-700',
  REJECTED:        'bg-red-50 text-red-700',
  ERROR:           'bg-red-100 text-red-800',
};

const PAGE_SIZE = 10;

export default function AdminDocumentsPage() {
  const [docs, setDocs]         = useState<Document[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter]     = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchDocs = useCallback(async (p: number, s: string, t: string, st: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', String(PAGE_SIZE));
      if (s)           params.set('search', s);
      if (t  !== 'ALL') params.set('type', t);
      if (st !== 'ALL') params.set('status', st);
      const res = await api.get(`/admin/documents?${params.toString()}`);
      setDocs(res.data.data);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs(page, search, typeFilter, statusFilter);
  }, [page, search, typeFilter, statusFilter, fetchDocs]);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const selectCls = 'text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';

  return (
    <div className="space-y-5 max-w-6xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">All Documents</h1>
          <p className="text-sm text-slate-500 mt-0.5">Every document across all users — {total} total.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search filename..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded pl-8 pr-3 py-1.5 bg-white text-slate-700 w-52 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className={selectCls}>
          <option value="ALL">All Types</option>
          <option value="INVOICE">Invoice</option>
          <option value="CERTIFICATE">Certificate</option>
          <option value="REPORT">Report</option>
          <option value="UNKNOWN">Unknown</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={selectCls}>
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="REVIEW_REQUIRED">Review Required</option>
          <option value="VALIDATED">Validated</option>
          <option value="REJECTED">Rejected</option>
          <option value="ERROR">Error</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-slate-900/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Filename</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Owner</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Type</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Confidence</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Size</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Uploaded</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
            ) : docs.length === 0 ? (
              <tr><td colSpan={7}>
                <EmptyState
                  icon={<svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                  title="No documents found"
                  description="Try adjusting your filters."
                />
              </td></tr>
            ) : docs.map((doc) => (
              <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-800 text-xs font-medium max-w-xs truncate">{doc.originalName}</td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-[180px] truncate">{doc.user.email}</td>
                <td className="px-4 py-3 text-slate-500 text-xs capitalize">{doc.type.toLowerCase()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_STYLES[doc.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {doc.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {doc.extractedData ? `${Math.round(doc.extractedData.confidence)}%` : '—'}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{formatSize(doc.size)}</td>
                <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(doc.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{total} results · Page {page} of {totalPages}</span>
          <div className="flex gap-1.5">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Prev</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
