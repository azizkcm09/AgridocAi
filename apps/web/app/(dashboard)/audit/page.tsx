'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

type AuditLog = {
  id: string;
  action: string;
  description: string | null;
  timestamp: string;
  documentId: string | null;
  document: { originalName: string; type: string } | null;
};

const ACTION_COLORS: Record<string, string> = {
  UPLOAD:        'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  AUTO_EXTRACT:  'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  UPDATE_FIELD:  'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  VALIDATE_DOC:  'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  DELETE_DOC:    'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  EXPORT:        'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Audit Logs</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Full history of all actions across your documents.</p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={actionFilter}
          onChange={(e) => handleActionChange(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">Action: All</option>
          <option value="UPLOAD">Upload</option>
          <option value="AUTO_EXTRACT">Auto Extract</option>
          <option value="UPDATE_FIELD">Update Field</option>
          <option value="VALIDATE_DOC">Validate</option>
          <option value="DELETE_DOC">Delete</option>
          <option value="EXPORT">Export</option>
        </select>

        <span className="text-sm text-gray-400">{total} total entries</span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Timestamp</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Action</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Document</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Description</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400">Loading...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className={`border-b border-gray-50 dark:border-gray-800 transition-colors ${
                    log.documentId ? 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer' : ''
                  }`}
                  onClick={() => log.documentId && router.push(`/documents/${log.documentId}`)}
                >
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                      {formatAction(log.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-xs truncate">
                    {log.document?.originalName ?? (
                      <span className="text-gray-400 italic">Deleted document</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-sm truncate">
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
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
