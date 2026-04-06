'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import api from '@/lib/api';
import fetcher from '@/lib/fetcher';
import axios from 'axios';
import { useToast } from '@/lib/toast-context';
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

const DOC_TYPES = [
  { label: 'Invoice',     value: 'INVOICE' },
  { label: 'Certificate', value: 'CERTIFICATE' },
  { label: 'Report',      value: 'REPORT' },
  { label: 'Unknown',     value: 'UNKNOWN' },
];

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

  const { addToast } = useToast();
  const { data: analytics, isLoading: analyticsLoading, mutate: mutateAnalytics } = useSWR<Analytics>('/documents/analytics', fetcher);
  const { data: auditLogs, isLoading: logsLoading } = useSWR<AuditLog[]>('/audit/recent', fetcher);

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [uploadMsg, setUploadMsg]   = useState<string | null>(null);
  const [docType, setDocType]       = useState('INVOICE');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  const loading = analyticsLoading || logsLoading;
  const kpis = analytics?.kpis;

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadMsg('Requesting upload URL...');
    try {
      const urlRes = await api.post('/storage/presigned-url', {
        fileName: file.name,
        contentType: file.type,
      });
      const { uploadUrl, key } = urlRes.data;

      setUploadMsg('Uploading file...');
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
      });

      setUploadMsg('Queuing for AI extraction...');
      await api.post('/documents', {
        originalName: file.name,
        storagePath: key,
        mimeType: file.type,
        size: file.size,
        type: docType,
      });

      addToast('Document uploaded and queued for AI extraction.', 'success');
      setUploadMsg(null);
      setPendingFile(null);
      await mutateAnalytics();
    } catch {
      addToast('Upload failed. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setPendingFile(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    if (e.target) e.target.value = '';
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome back.</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Here&apos;s what&apos;s happening with your documents.</p>
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
          className="bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 border-l-4 border-indigo-500 p-5 hover:shadow-md hover:ring-slate-900/10 cursor-pointer transition-shadow"
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

        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 border-l-4 border-indigo-500 p-5">
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

        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 border-l-4 border-indigo-500 p-5">
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

      {/* Bottom: Upload zone + Audit logs */}
      <div className="grid grid-cols-5 gap-4">

        {/* Upload zone - 3/5 width */}
        <div className="col-span-5 lg:col-span-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 p-5">

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Upload Document</p>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="text-sm border-slate-200 dark:border-slate-700 rounded-md border px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); if (!pendingFile) setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => !uploading && !pendingFile && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg flex flex-col items-center justify-center py-14 transition-colors ${
              pendingFile
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                : isDragging
                  ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 cursor-pointer'
                  : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer'
            }`}
          >
            {pendingFile ? (
              <>
                <svg className="w-10 h-10 text-indigo-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{pendingFile.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatBytes(pendingFile.size)} &middot; {pendingFile.type || 'unknown type'}</p>
              </>
            ) : (
              <>
                <svg className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {uploading ? 'Uploading...' : 'Drop invoice or certificate here to process.'}
                </p>
                <p className="text-xs text-slate-400 mt-1">or click to select files</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/tiff,application/pdf"
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          {pendingFile && !uploading && (
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => { setPendingFile(null); setUploadMsg(null); }}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpload(pendingFile)}
                className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
              >
                Proceed
              </button>
            </div>
          )}

          {uploadMsg && (
            <p className={`mt-3 text-sm text-center ${uploadMsg.startsWith('Document uploaded') ? 'text-emerald-600' : uploadMsg.startsWith('Upload failed') ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
              {uploadMsg}
            </p>
          )}
        </div>

        {/* Audit logs - 2/5 width */}
        <div className="col-span-5 lg:col-span-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 p-5">
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
