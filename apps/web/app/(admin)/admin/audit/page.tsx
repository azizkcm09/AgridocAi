'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { TableRowSkeleton } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';

type AuditLog = {
  id: string;
  action: string;
  description: string | null;
  timestamp: string;
  user: { email: string; name: string | null } | null;
  document: { originalName: string; type: string } | null;
};

const ACTION_LABELS: Record<string, string> = {
  UPLOAD:       'Upload',
  AUTO_EXTRACT: 'Auto Extract',
  UPDATE_FIELD: 'Update Field',
  VALIDATE_DOC: 'Validated',
  DELETE_DOC:   'Deleted',
  EXPORT:       'Export',
};

const ACTION_COLORS: Record<string, string> = {
  UPLOAD:       'bg-slate-100 text-slate-600',
  AUTO_EXTRACT: 'bg-violet-50 text-violet-700',
  UPDATE_FIELD: 'bg-sky-50 text-sky-700',
  VALIDATE_DOC: 'bg-emerald-50 text-emerald-700',
  DELETE_DOC:   'bg-red-50 text-red-700',
  EXPORT:       'bg-slate-100 text-slate-600',
};

const PAGE_SIZE = 12;

export default function AdminAuditPage() {
  const [logs, setLogs]     = useState<AuditLog[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);
  const [actionFilter, setActionFilter] = useState('ALL');

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchLogs = useCallback(async (p: number, action: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', String(PAGE_SIZE));
      if (action !== 'ALL') params.set('action', action);
      const res = await api.get(`/admin/audit?${params.toString()}`);
      setLogs(res.data.data);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(page, actionFilter); }, [page, actionFilter, fetchLogs]);

  function handleActionChange(value: string) {
    setActionFilter(value);
    setPage(1);
  }

  function formatTimestamp(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-5 max-w-6xl">

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Platform Audit Log</h1>
        <p className="text-sm text-slate-500 mt-0.5">Complete action history across all users — {total} entries.</p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <select
          value={actionFilter}
          onChange={(e) => handleActionChange(e.target.value)}
          className="text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="ALL">All Actions</option>
          <option value="UPLOAD">Upload</option>
          <option value="AUTO_EXTRACT">Auto Extract</option>
          <option value="UPDATE_FIELD">Update Field</option>
          <option value="VALIDATE_DOC">Validate</option>
          <option value="DELETE_DOC">Delete</option>
          <option value="EXPORT">Export</option>
        </select>
        <span className="text-xs text-slate-400">{total} records</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-slate-900/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Timestamp</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">User</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Action</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Document</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
            ) : logs.length === 0 ? (
              <tr><td colSpan={5}>
                <EmptyState
                  icon={<svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                  title="No activity recorded"
                  description="Platform-wide actions will appear here."
                />
              </td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>
                <td className="px-4 py-3">
                  <p className="text-xs text-slate-700">{log.user?.email ?? '—'}</p>
                  {log.user?.name && <p className="text-[11px] text-slate-400">{log.user.name}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-600'}`}>
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">
                  {log.document?.originalName ?? <span className="italic text-slate-300">Deleted</span>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 max-w-sm truncate">
                  {log.description ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{total} records · Page {page} of {totalPages}</span>
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
