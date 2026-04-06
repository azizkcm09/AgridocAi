'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { ChartSkeleton, StatCardSkeleton } from '@/components/Skeleton';
import DocumentsOverTimeChart from '@/components/charts/DocumentsOverTimeChart';
import DocumentsByTypeChart from '@/components/charts/DocumentsByTypeChart';
import DocumentsByStatusChart from '@/components/charts/DocumentsByStatusChart';

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
  byType: { type: string; count: number }[];
  recentVolume: { date: string; count: number }[];
};

type StatCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
};

function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm ring-1 ring-slate-900/5 p-5 border-l-4 ${accent}`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData]       = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/analytics')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const docsPerDay   = data?.recentVolume.map((v) => ({ date: v.date, count: v.count })) ?? [];
  const docsByType   = data?.byType.map((b) => ({ type: b.type, count: b.count })) ?? [];
  const docsByStatus = data
    ? [
        { status: 'PENDING',    count: data.documents.pending },
        { status: 'PROCESSING', count: data.documents.processing },
        { status: 'VALIDATED',  count: data.documents.validated },
        { status: 'REJECTED',   count: data.documents.rejected },
        { status: 'ERROR',      count: data.documents.error },
      ]
    : [];

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Platform Analytics</h1>
        <p className="text-sm text-slate-500 mt-0.5">Aggregated statistics across all users and documents.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : data ? (
          <>
            <StatCard label="Total Documents" value={data.documents.total}              sub="platform-wide"                       accent="border-slate-400" />
            <StatCard label="Validated"       value={data.documents.validated}          sub={`${data.documents.validationRate}% rate`} accent="border-emerald-500" />
            <StatCard label="Rejected"        value={data.documents.rejected}           sub="platform-wide"                       accent="border-red-400" />
            <StatCard label="Total Users"     value={data.users.total}                  sub={`${data.users.active} active`}       accent="border-indigo-500" />
          </>
        ) : null}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <>
            <div className="lg:col-span-2"><ChartSkeleton /></div>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <div className="lg:col-span-2">
              <DocumentsOverTimeChart data={docsPerDay} />
            </div>
            <DocumentsByTypeChart data={docsByType} />
            <DocumentsByStatusChart data={docsByStatus} />
          </>
        )}
      </div>
    </div>
  );
}
