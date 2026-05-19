'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import DocumentsOverTimeChart from '@/components/charts/DocumentsOverTimeChart';
import DocumentsByTypeChart from '@/components/charts/DocumentsByTypeChart';
import DocumentsByStatusChart from '@/components/charts/DocumentsByStatusChart';
import ConfidenceDistributionChart from '@/components/charts/ConfidenceDistributionChart';
import { StatCardSkeleton, ChartSkeleton, Skeleton } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';

type Analytics = {
  docsPerDay: { date: string; count: number }[];
  docsByType: { type: string; count: number }[];
  docsByStatus: { status: string; count: number }[];
  confidenceDistribution: { bucket: string; count: number }[];
  kpis: {
    total: number;
    pendingReview: number;
    avgConfidence: number;
    validationRate: number;
    rejectionRate: number;
    avgProcessingTimeSec: number;
    thisWeekCount: number;
    lastWeekCount: number;
  };
};

type AuditLog = {
  id: string;
  action: string;
  timestamp: string;
  documentId: string | null;
  document: { originalName: string } | null;
};

function WowIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const pct = previous === 0 ? 100 : Math.round(((current - previous) / previous) * 100);
  const isUp = pct >= 0;
  return (
    <span className={`inline-flex items-center text-xs font-medium ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
      {isUp ? (
        <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
      ) : (
        <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      )}
      {Math.abs(pct)}% vs last week
    </span>
  );
}

function formatSeconds(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function DashboardPage() {
  const router = useRouter();

  const { data: analytics, isLoading: analyticsLoading } = useSWR<Analytics>('/documents/analytics', fetcher);
  const { data: auditLogs, isLoading: logsLoading } = useSWR<AuditLog[]>('/audit/recent', fetcher);

  const loading = analyticsLoading || logsLoading;
  const kpis = analytics?.kpis;

  function formatTimeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function auditIconChar(action: string) {
    if (action === 'VALIDATE_DOC') return '\u2713';
    if (action === 'DELETE_DOC')   return '\u2717';
    return '\u2191';
  }

  function auditIconStyle(action: string) {
    if (action === 'VALIDATE_DOC') return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30';
    if (action === 'DELETE_DOC')   return 'text-rose-600 bg-rose-50 dark:bg-rose-900/30';
    return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30';
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Page title */}
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[color:var(--foreground)] tracking-tight">
          Welcome back.
        </h1>
        <p className="text-sm text-[color:var(--foreground-muted)] mt-1">
          Here&apos;s what&apos;s happening with your documents.
        </p>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div
          onClick={() => router.push('/documents')}
          className="bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 border-l-4 border-[color:var(--brand)] p-5 hover:shadow-md hover:ring-slate-900/10 cursor-pointer transition-shadow"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Documents</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{kpis?.total ?? 0}</p>
          <WowIndicator current={kpis?.thisWeekCount ?? 0} previous={kpis?.lastWeekCount ?? 0} />
        </div>

        <div
          onClick={() => router.push('/documents?status=REVIEW_REQUIRED')}
          className="bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 border-l-4 border-amber-500 p-5 hover:ring-amber-300 dark:hover:ring-amber-700 cursor-pointer transition-colors"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">Pending Review</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{kpis?.pendingReview ?? 0}</p>
          {(kpis?.pendingReview ?? 0) > 0 && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700">
              Needs attention
            </span>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 border-l-4 border-[color:var(--brand)] p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Avg. Confidence</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{kpis?.avgConfidence ?? 0}%</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 border-l-4 border-emerald-500 p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Validation Rate</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{kpis?.validationRate ?? 0}%</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 border-l-4 border-rose-500 p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Rejection Rate</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{kpis?.rejectionRate ?? 0}%</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 border-l-4 border-[color:var(--brand)] p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Avg. Processing</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{formatSeconds(kpis?.avgProcessingTimeSec ?? 0)}</p>
        </div>
      </div>
      )}

      {/* Charts Row */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <ChartSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DocumentsOverTimeChart data={analytics?.docsPerDay ?? []} />
          <DocumentsByTypeChart data={analytics?.docsByType ?? []} />
          <DocumentsByStatusChart data={analytics?.docsByStatus ?? []} />
        </div>
      )}

      {/* Confidence Distribution (full width) */}
      {loading ? (
        <ChartSkeleton />
      ) : (
        <ConfidenceDistributionChart data={analytics?.confidenceDistribution ?? []} />
      )}

      {/* Bottom: Upload CTA + Audit logs */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Upload CTA - 3/5 width on lg */}
        <Link
          href="/upload"
          className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 p-6 hover:ring-[color:var(--brand)] dark:hover:ring-[color:var(--brand)] hover:shadow-md transition-all flex items-center gap-5"
        >
          <div className="w-12 h-12 rounded-lg bg-[color:var(--brand-soft)] flex items-center justify-center shrink-0 text-[color:var(--brand)]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M7 16a4 4 0 01-.88-7.9A5 5 0 0117.9 8a4.5 4.5 0 01-.4 8.94M12 12v9m0 0l-3-3m3 3l3-3" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[color:var(--foreground)]">Upload a document</p>
            <p className="text-xs text-[color:var(--foreground-muted)] mt-0.5">Send invoices, certificates, or reports through OCR + AI extraction.</p>
          </div>
          <svg className="w-5 h-5 text-[color:var(--foreground-faint)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {/* Audit logs - 2/5 width on lg */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Recent Audit Logs</p>
            <Link href="/audit" className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors">
              View all
            </Link>
          </div>

          {logsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-2">
                  <Skeleton className="w-6 h-6 rounded-full shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1.5" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-3 w-10 shrink-0" />
                </div>
              ))}
            </div>
          ) : !auditLogs || auditLogs.length === 0 ? (
            <EmptyState
              icon={<svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              title="No activity yet"
              description="Actions on your documents will appear here."
            />
          ) : (
            <div className="space-y-1">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => log.documentId && router.push(`/documents/${log.documentId}`)}
                  className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                    log.documentId ? 'hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer' : ''
                  }`}
                >
                  <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${auditIconStyle(log.action)}`}>
                    {auditIconChar(log.action)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 dark:text-slate-200 truncate">
                      {log.document?.originalName ?? <span className="text-slate-400 italic">Deleted document</span>}
                    </p>
                    <p className="text-xs text-slate-400 capitalize">{log.action.toLowerCase().replace(/_/g, ' ')}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{formatTimeAgo(log.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
