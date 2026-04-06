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

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData]     = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/analytics')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  // Shape data for existing chart components
  const docsPerDay = data?.recentVolume.map((v) => ({ date: v.date, count: v.count })) ?? [];
  const docsByType = data?.byType.map((b) => ({ type: b.type, count: b.count })) ?? [];
  const docsByStatus = data
    ? [
        { status: 'PENDING',         count: data.documents.pending },
        { status: 'PROCESSING',      count: data.documents.processing },
        { status: 'VALIDATED',       count: data.documents.validated },
        { status: 'REJECTED',        count: data.documents.rejected },
        { status: 'ERROR',           count: data.documents.error },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Platform Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Aggregated stats across all users and documents.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : data ? (
          <>
            <StatCard label="Total Documents"   value={data.documents.total}              sub="platform-wide" />
            <StatCard label="Validated"         value={data.documents.validated}          sub={`${data.documents.validationRate}% rate`} />
            <StatCard label="Rejected"          value={data.documents.rejected}           sub="platform-wide" />
            <StatCard label="Total Users"       value={data.users.total}                  sub={`${data.users.active} active`} />
          </>
        ) : null}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <>
            <ChartSkeleton />
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
