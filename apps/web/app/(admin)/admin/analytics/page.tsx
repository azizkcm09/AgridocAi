'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { ChartSkeleton, StatCardSkeleton } from '@/components/Skeleton';
import DocumentsOverTimeChart from '@/components/charts/DocumentsOverTimeChart';
import DocumentsByTypeChart from '@/components/charts/DocumentsByTypeChart';
import DocumentsByStatusChart from '@/components/charts/DocumentsByStatusChart';

type Analytics = {
  range: number;
  users: {
    total: number;
    active: number;
    newThisPeriod: number;
    trend: number;
  };
  documents: {
    total: number;
    thisPeriod: number;
    trend: number;
    validated: number;
    validatedThisPeriod: number;
    validatedTrend: number;
    rejected: number;
    pending: number;
    processing: number;
    error: number;
    reviewRequired: number;
    validationRate: number;
  };
  byType: { type: string; count: number }[];
  recentVolume: { date: string; count: number }[];
};

const RANGE_OPTIONS = [
  { label: '7 days',  value: 7  },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

type TrendBadgeProps = { trend: number; positiveIsGood?: boolean };

function TrendBadge({ trend, positiveIsGood = true }: TrendBadgeProps) {
  if (trend === 0) return <span className="text-[10px] text-slate-400">No change</span>;
  const isPositive = trend > 0;
  const isGood = positiveIsGood ? isPositive : !isPositive;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isGood ? 'text-emerald-600' : 'text-red-500'}`}>
      {isPositive ? (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      )}
      {Math.abs(trend)}% vs prev period
    </span>
  );
}

type StatCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
  positiveIsGood?: boolean;
  accent: string;
};

function StatCard({ label, value, sub, trend, positiveIsGood = true, accent }: StatCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm ring-1 ring-slate-900/5 p-5 border-l-4 ${accent}`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      <div className="flex items-center gap-2 mt-1">
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
        {trend !== undefined && <TrendBadge trend={trend} positiveIsGood={positiveIsGood} />}
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData]       = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange]     = useState(30);

  const fetchAnalytics = useCallback(async (r: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/analytics?range=${r}`);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(range); }, [range, fetchAnalytics]);

  const docsPerDay   = data?.recentVolume ?? [];
  const docsByType   = data?.byType ?? [];
  const docsByStatus = data
    ? [
        { status: 'PENDING',         count: data.documents.pending },
        { status: 'PROCESSING',      count: data.documents.processing },
        { status: 'REVIEW_REQUIRED', count: data.documents.reviewRequired },
        { status: 'VALIDATED',       count: data.documents.validated },
        { status: 'REJECTED',        count: data.documents.rejected },
        { status: 'ERROR',           count: data.documents.error },
      ]
    : [];

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Header + range selector */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Platform Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Aggregated statistics across all users and documents.</p>
        </div>
        <div className="flex items-center gap-1 bg-white rounded-lg shadow-sm ring-1 ring-slate-900/5 p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                range === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : data ? (
          <>
            <StatCard
              label="Total Documents"
              value={data.documents.total}
              sub={`${data.documents.thisPeriod} this period`}
              trend={data.documents.trend}
              accent="border-slate-400"
            />
            <StatCard
              label="Validated"
              value={data.documents.validated}
              sub={`${data.documents.validationRate}% rate`}
              trend={data.documents.validatedTrend}
              accent="border-emerald-500"
            />
            <StatCard
              label="Rejected"
              value={data.documents.rejected}
              sub="platform-wide"
              trend={undefined}
              positiveIsGood={false}
              accent="border-red-400"
            />
            <StatCard
              label="Total Users"
              value={data.users.total}
              sub={`${data.users.newThisPeriod} joined this period`}
              trend={data.users.trend}
              accent="border-indigo-500"
            />
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
