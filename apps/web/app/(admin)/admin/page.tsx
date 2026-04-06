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

const ACTION_COLORS: Record<string, string> = {
  UPLOAD:       'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  AUTO_EXTRACT: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  UPDATE_FIELD: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  VALIDATE_DOC: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  DELETE_DOC:   'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  EXPORT:       'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
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
    ]).then(([analyticsRes, auditRes]) => {
      setAnalytics(analyticsRes.data);
      setRecentLogs(auditRes.data.data);
    }).finally(() => setLoading(false));
  }, []);

  function formatTimestamp(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function formatAction(action: string) {
    return action.charAt(0) + action.slice(1).toLowerCase().replace(/_/g, ' ');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Platform Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Real-time health across all users and documents.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : analytics ? (
          <>
            <StatCard label="Total Users"       value={analytics.users.total}                 sub={`${analytics.users.active} active`}                            color="text-gray-900 dark:text-gray-100" />
            <StatCard label="Total Documents"   value={analytics.documents.total}             sub={`${analytics.documents.pending} pending`}                      color="text-gray-900 dark:text-gray-100" />
            <StatCard label="Validation Rate"   value={`${analytics.documents.validationRate}%`} sub={`${analytics.documents.validated} validated`}              color="text-green-600 dark:text-green-400" />
            <StatCard label="Errors / Rejected" value={analytics.documents.error + analytics.documents.rejected} sub="platform-wide"                             color="text-red-500 dark:text-red-400" />
          </>
        ) : null}
      </div>

      {/* Recent platform activity */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent Platform Activity</p>
          <Link href="/admin/audit" className="text-xs text-amber-600 dark:text-amber-400 hover:underline">View all</Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Timestamp</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">User</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Action</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Document</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={4} />)
            ) : recentLogs.map((log) => (
              <tr key={log.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{log.user?.email ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                    {formatAction(log.action)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                  {log.document?.originalName ?? <span className="italic text-gray-400">Deleted</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
