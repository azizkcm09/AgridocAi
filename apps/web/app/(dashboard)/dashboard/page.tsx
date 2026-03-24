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
    <span className={`inline-flex items-center text-xs font-medium ${isUp ? 'text-green-600' : 'text-red-500'}`}>
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
    if (action === 'VALIDATE_DOC') return 'text-green-600 bg-green-50 dark:bg-green-900/30';
    if (action === 'DELETE_DOC')   return 'text-red-600 bg-red-50 dark:bg-red-900/30';
    return 'text-blue-600 bg-blue-50 dark:bg-blue-900/30';
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome back.</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Here&apos;s what&apos;s happening with your documents.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Documents</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{kpis?.total ?? 0}</p>
          <WowIndicator current={kpis?.thisWeekCount ?? 0} previous={kpis?.lastWeekCount ?? 0} />
        </div>

        <div
          onClick={() => router.push('/documents?status=REVIEW_REQUIRED')}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 hover:border-yellow-200 dark:hover:border-yellow-700 cursor-pointer transition-colors"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending Review</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{kpis?.pendingReview ?? 0}</p>
          {(kpis?.pendingReview ?? 0) > 0 && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-700">
              Needs attention
            </span>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Confidence</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{kpis?.avgConfidence ?? 0}%</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Validation Rate</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{kpis?.validationRate ?? 0}%</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Rejection Rate</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{kpis?.rejectionRate ?? 0}%</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Processing</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{formatSeconds(kpis?.avgProcessingTimeSec ?? 0)}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DocumentsOverTimeChart data={analytics?.docsPerDay ?? []} />
        <DocumentsByTypeChart data={analytics?.docsByType ?? []} />
        <DocumentsByStatusChart data={analytics?.docsByStatus ?? []} />
      </div>

      {/* Confidence Distribution (full width) */}
      <ConfidenceDistributionChart data={analytics?.confidenceDistribution ?? []} />

      {/* Bottom: Upload zone + Audit logs */}
      <div className="grid grid-cols-5 gap-4">

        {/* Upload zone - 3/5 width */}
        <div className="col-span-5 lg:col-span-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload Document</p>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-14 transition-colors ${
              pendingFile
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : isDragging
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 cursor-pointer'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'
            }`}
          >
            {pendingFile ? (
              <>
                <svg className="w-10 h-10 text-blue-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{pendingFile.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatBytes(pendingFile.size)} &middot; {pendingFile.type || 'unknown type'}</p>
              </>
            ) : (
              <>
                <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {uploading ? 'Uploading...' : 'Drop invoice or certificate here to process.'}
                </p>
                <p className="text-xs text-gray-400 mt-1">or click to select files</p>
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
                className="flex-1 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpload(pendingFile)}
                className="flex-1 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
              >
                Proceed
              </button>
            </div>
          )}

          {uploadMsg && (
            <p className={`mt-3 text-sm text-center ${uploadMsg.startsWith('Document uploaded') ? 'text-green-600' : uploadMsg.startsWith('Upload failed') ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
              {uploadMsg}
            </p>
          )}
        </div>

        {/* Audit logs - 2/5 width */}
        <div className="col-span-5 lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent Audit Logs</p>
            <Link href="/audit" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors">
              View all
            </Link>
          </div>

          {!auditLogs || auditLogs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No recent activity.</p>
          ) : (
            <div className="space-y-1">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => log.documentId && router.push(`/documents/${log.documentId}`)}
                  className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                    log.documentId ? 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer' : ''
                  }`}
                >
                  <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${auditIconStyle(log.action)}`}>
                    {auditIconChar(log.action)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                      {log.document?.originalName ?? <span className="text-gray-400 italic">Deleted document</span>}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{log.action.toLowerCase().replace(/_/g, ' ')}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">{formatTimeAgo(log.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
