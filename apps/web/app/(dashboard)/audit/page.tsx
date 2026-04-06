'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { TableRowSkeleton } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';

type AuditLog = {
  id: string;
  action: string;
  description: string | null;
  timestamp: string;
  documentId: string | null;
  document: { originalName: string; type: string } | null;
};

const ACTION_COLORS: Record<string, string> = {
  UPLOAD:        'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
  AUTO_EXTRACT:  'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
  UPDATE_FIELD:  'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  VALIDATE_DOC:  'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  DELETE_DOC:    'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
  EXPORT:        'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
};

const PAGE_SIZE = 12;

export default function AuditPage() {
  const router = useRouter();

  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [actionFilter, setActionFilter] = useState('ALL');

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchLogs = useCallback(async (
    currentPage: number,
    currentAction: string,
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(PAGE_SIZE));
      if (currentAction !== 'ALL') params.set('action', currentAction);

      const res = await api.get(`/audit?${params.toString()}`);
      setLogs(res.data.data);
      setTotal(res.data.total);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchLogs(page, actionFilter);
  }, [page, actionFilter, fetchLogs]);

  function handleActionChange(value: string) {
    setActionFilter(value);
    setPage(1);
  }

  function formatTimestamp(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    }) + ' ' + d.toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit',
    });
  }

  function formatAction(action: string) {
    return action.charAt(0) + action.slice(1).toLowerCase().replace(/_/g, ' ');
  }

  return (
    <div className="space-y-4">

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Audit Logs</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Full history of all actions across your documents.</p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={actionFilter}
          onChange={(e) => handleActionChange(e.target.value)}
          className="text-sm border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        >
          <option value="ALL">Action: All</option>
          <option value="UPLOAD">Upload</option>
          <option value="AUTO_EXTRACT">Auto Extract</option>
          <option value="UPDATE_FIELD">Update Field</option>
          <option value="VALIDATE_DOC">Validate</option>
          <option value="DELETE_DOC">Delete</option>
          <option value="EXPORT">Export</option>
        </select>

        <span className="text-sm text-slate-400">{total} total entries</span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Timestamp</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Action</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Document</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Description</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={4} />)
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState
                    icon={<svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    title="No activity yet"
                    description="Actions on your documents will appear here."
                  />
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className={`border-b border-slate-50 dark:border-slate-800 transition-colors ${
                    log.documentId ? 'hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer' : ''
                  }`}
                  onClick={() => log.documentId && router.push(`/documents/${log.documentId}`)}
                >
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                      {formatAction(log.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                    {log.document?.originalName ?? (
                      <span className="text-slate-400 italic">Deleted document</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-sm truncate">
                    {log.description ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>Page {page} of {totalPages}</span>
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
