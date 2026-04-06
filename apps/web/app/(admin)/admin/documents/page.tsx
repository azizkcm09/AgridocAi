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

const STATUS_COLORS: Record<string, string> = {
  PENDING:          'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  PROCESSING:       'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  REVIEW_REQUIRED:  'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  VALIDATED:        'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  REJECTED:         'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  ERROR:            'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400',
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
      if (s)          params.set('search', s);
      if (t !== 'ALL')  params.set('type', t);
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">All Documents</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Every document across all users — {total} total.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by filename..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500 w-56"
        />
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="ALL">Type: All</option>
          <option value="INVOICE">Invoice</option>
          <option value="CERTIFICATE">Certificate</option>
          <option value="REPORT">Report</option>
          <option value="UNKNOWN">Unknown</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="ALL">Status: All</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="REVIEW_REQUIRED">Review Required</option>
          <option value="VALIDATED">Validated</option>
          <option value="REJECTED">Rejected</option>
          <option value="ERROR">Error</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Filename</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Owner</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Confidence</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Size</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
            ) : docs.length === 0 ? (
              <tr><td colSpan={7}>
                <EmptyState
                  icon={<svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                  title="No documents found"
                  description="Try adjusting your filters."
                />
              </td></tr>
            ) : docs.map((doc) => (
              <tr key={doc.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100 max-w-xs truncate font-medium">{doc.originalName}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">{doc.user.email}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 capitalize">{doc.type.toLowerCase()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {doc.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {doc.extractedData ? `${Math.round(doc.extractedData.confidence)}%` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatSize(doc.size)}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(doc.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">›</button>
          </div>
        </div>
      )}
    </div>
  );
}
