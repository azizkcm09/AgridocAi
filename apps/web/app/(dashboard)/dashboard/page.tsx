'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import axios from 'axios';

// Shape of GET /documents/stats response
type Stats = {
  total: number;
  pendingReview: number;
  avgConfidence: number;
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

export default function DashboardPage() {
  const router = useRouter();

  const [stats, setStats]         = useState<Stats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading]     = useState(true);

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [uploadMsg, setUploadMsg]   = useState<string | null>(null);
  const [docType, setDocType]       = useState('INVOICE');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  // Extracted into its own function so we can call it after upload too
  // useCallback gives it a stable reference so the useEffect dependency is safe
  const loadStats = useCallback(async () => {
    const res = await api.get('/documents/stats');
    setStats(res.data); // { total, pendingReview, avgConfidence }
  }, []);

  // --- Fetch stats + audit logs on page load ---
  useEffect(() => {
    async function load() {
      try {
        // Both run at the same time
        const [, auditRes] = await Promise.all([
          loadStats(),
          api.get('/audit/recent'),
        ]);
        setAuditLogs(auditRes.data);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router, loadStats]);

  // --- Upload: 3-step pipeline ---
  async function handleUpload(file: File) {
    setUploading(true);
    setUploadMsg('Requesting upload URL...');
    try {
      // Step 1: presigned URL from NestJS
      const urlRes = await api.post('/storage/presigned-url', {
        fileName: file.name,
        contentType: file.type,
      });
      const { uploadUrl, key } = urlRes.data;

      // Step 2: upload directly to MinIO (plain axios — no JWT header, presigned URL handles auth)
      setUploadMsg('Uploading file...');
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
      });

      // Step 3: register document in NestJS → triggers BullMQ job → AI pipeline
      setUploadMsg('Queuing for AI extraction...');
      await api.post('/documents', {
        originalName: file.name,
        storagePath: key,
        mimeType: file.type,
        size: file.size,
        type: docType,
      });

      setUploadMsg('✓ Document uploaded and queued for AI extraction.');
      setPendingFile(null);

      // Refresh stats cards so Total Processed updates immediately
      await loadStats();
    } catch {
      setUploadMsg('Upload failed. Please try again.');
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
    // Reset input so the same file can be re-selected
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
    if (action === 'VALIDATE_DOC') return '✓';
    if (action === 'DELETE_DOC')   return '✗';
    return '↑';
  }

  function auditIconStyle(action: string) {
    if (action === 'VALIDATE_DOC') return 'text-green-600 bg-green-50';
    if (action === 'DELETE_DOC')   return 'text-red-600 bg-red-50';
    return 'text-blue-600 bg-blue-50';
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back.</h1>
        <p className="text-sm text-gray-500 mt-1">Here&apos;s what&apos;s happening with your documents.</p>
      </div>

      {/* ── STATS CARDS — real numbers from GET /documents/stats ── */}
      <div className="grid grid-cols-3 gap-4">

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total Processed</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.total ?? 0}</p>
        </div>

        <div
          onClick={() => router.push('/documents?status=REVIEW_REQUIRED')}
          className="bg-white rounded-xl border border-gray-100 p-5 hover:border-yellow-200 cursor-pointer transition-colors"
        >
          <p className="text-sm text-gray-500">Pending Review</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.pendingReview ?? 0}</p>
          {(stats?.pendingReview ?? 0) > 0 && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded bg-yellow-50 text-yellow-700 border border-yellow-200">
              Needs attention
            </span>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Avg. AI Confidence</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.avgConfidence ?? 0}%</p>
        </div>

      </div>

      {/* ── BOTTOM: Upload zone + Audit logs ── */}
      <div className="grid grid-cols-5 gap-4">

        {/* Upload zone — 3/5 width */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-100 p-5">

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-700">Upload Document</p>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                ? 'border-blue-400 bg-blue-50'
                : isDragging
                  ? 'border-blue-400 bg-blue-50 cursor-pointer'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 cursor-pointer'
            }`}
          >
            {pendingFile ? (
              <>
                <svg className="w-10 h-10 text-blue-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium text-gray-800">{pendingFile.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatBytes(pendingFile.size)} · {pendingFile.type || 'unknown type'}</p>
              </>
            ) : (
              <>
                <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
                <p className="text-sm font-medium text-gray-600">
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
                className="flex-1 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpload(pendingFile)}
                className="flex-1 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                Proceed
              </button>
            </div>
          )}

          {uploadMsg && (
            <p className={`mt-3 text-sm text-center ${uploadMsg.startsWith('✓') ? 'text-green-600' : uploadMsg.startsWith('Upload failed') ? 'text-red-500' : 'text-gray-500'}`}>
              {uploadMsg}
            </p>
          )}
        </div>

        {/* Audit logs — 2/5 width */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-700">Recent Audit Logs</p>
            <Link href="/audit" className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
              View all
            </Link>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No recent activity.</p>
          ) : (
            <div className="space-y-1">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => log.documentId && router.push(`/documents/${log.documentId}`)}
                  className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                    log.documentId ? 'hover:bg-gray-50 cursor-pointer' : ''
                  }`}
                >
                  <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${auditIconStyle(log.action)}`}>
                    {auditIconChar(log.action)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">
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
