'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { StatCardSkeleton, TableRowSkeleton } from '@/components/Skeleton';

type Analytics = {
  users: { total: number; active: number };
  documents: {
    total: number;
    validated: number;
    rejected: number;
    pending: number;
    processing: number;
    error: number;
    validationRate: number;
  };
};

type AuditLog = {
  id: string;
  action: string;
  timestamp: string;
  user: { email: string; name: string | null } | null;
  document: { originalName: string } | null;
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

type StatCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  icon: React.ReactNode;
  href?: string;
};

function StatCard({ label, value, sub, accent, icon, href }: StatCardProps) {
  const inner = (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className="text-slate-300 mt-0.5">{icon}</div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={`block bg-white rounded-lg shadow-sm ring-1 ring-slate-900/5 p-5 border-l-4 ${accent} hover:shadow-md hover:ring-slate-900/10 transition-shadow`}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm ring-1 ring-slate-900/5 p-5 border-l-4 ${accent}`}>
      {inner}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/analytics'),
      api.get('/admin/audit?limit=8'),
    ]).then(([aRes, auditRes]) => {
      setAnalytics(aRes.data);
      setRecentLogs(auditRes.data.data);
    }).finally(() => setLoading(false));
  }, []);

  function formatTimestamp(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Platform Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">Live snapshot of the entire platform.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : analytics ? (
          <>
            <StatCard
              label="Registered Users"
              value={analytics.users.total}
              sub={`${analytics.users.active} currently active`}
              accent="border-indigo-500"
              href="/admin/users"
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            />
            <StatCard
              label="Total Documents"
              value={analytics.documents.total}
              sub={`${analytics.documents.pending} pending review`}
              accent="border-slate-400"
              href="/admin/documents"
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            />
            <StatCard
              label="Validation Rate"
              value={`${analytics.documents.validationRate}%`}
              sub={`${analytics.documents.validated} documents validated`}
              accent="border-emerald-500"
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard
              label="Errors & Rejected"
              value={analytics.documents.error + analytics.documents.rejected}
              sub="requires attention"
              accent="border-red-500"
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
          </>
        ) : null}
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-slate-900/5 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Recent Platform Activity</p>
          <Link href="/admin/audit" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
            View full log →
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Timestamp</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">User</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Action</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Document</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={4} />)
            ) : recentLogs.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">No activity recorded yet.</td></tr>
            ) : recentLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{log.user?.email ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-600'}`}>
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">
                  {log.document?.originalName ?? <span className="italic text-slate-300">Deleted</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
