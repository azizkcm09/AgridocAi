'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import axios from 'axios';

// --- Types matching the NestJS API responses ---
type Document = {
  id: string;
  originalName: string;
  status: string;
  type: string;
  createdAt: string;
  extractedData?: { confidence: number } | null;
};

type AuditLog = {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  document: { originalName: string };
};

// Maps document type dropdown labels to the API enum values
const DOC_TYPES = [
  { label: 'Invoice',     value: 'INVOICE' },
  { label: 'Certificate', value: 'CERTIFICATE' },
  { label: 'Report',      value: 'REPORT' },
  { label: 'Unknown',     value: 'UNKNOWN' },
];

export default function DashboardPage() {
  const router = useRouter();

  // --- State ---
  const [documents, setDocuments]   = useState<Document[]>([]);
  const [auditLogs, setAuditLogs]   = useState<AuditLog[]>([]);
  const [loading, setLoading]       = useState(true);

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [uploadMsg, setUploadMsg]   = useState<string | null>(null);
  const [docType, setDocType]       = useState('INVOICE');
  const fileInputRef                = useRef<HTMLInputElement>(null);

  // --- Fetch data on page load ---
  useEffect(() => {
    async function load() {
      try {
        // Both requests run at the same time for speed
        const [docsRes, auditRes] = await Promise.all([
          api.get('/documents'),
          api.get('/audit/recent'),
        ]);
        setDocuments(docsRes.data.data); // { data: [...], total: N }
        setAuditLogs(auditRes.data);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  // --- Computed stats from the documents list ---
  const totalProcessed = documents.length;
  const pendingReview  = documents.filter((d) => d.status === 'REVIEW_REQUIRED').length;
  const docsWithConf   = documents.filter((d) => d.extractedData?.confidence != null);
  const avgConfidence  = docsWithConf.length > 0
    ? Math.round(docsWithConf.reduce((sum, d) => sum + (d.extractedData?.confidence ?? 0), 0) / docsWithConf.length)
    : 0;

  // --- Upload: 3-step pipeline ---
  async function handleUpload(file: File) {
    setUploading(true);
    setUploadMsg('Requesting upload URL...');
    try {
      // Step 1: Get a presigned URL from NestJS
      const urlRes = await api.post('/storage/presigned-url', {
        fileName: file.name,
        contentType: file.type,
      });
      const { uploadUrl, key } = urlRes.data;

      // Step 2: Upload directly to MinIO — use plain axios (no auth header, presigned URL handles security)
      setUploadMsg('Uploading file...');
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
      });

      // Step 3: Register in NestJS to trigger the BullMQ job → AI pipeline
      setUploadMsg('Queuing for AI extraction...');
      await api.post('/documents', {
        originalName: file.name,
        storagePath: key,
        mimeType: file.type,
        size: file.size,
        type: docType,
      });

      setUploadMsg('✓ Document uploaded and queued for AI extraction.');
      // Refresh stats
      const docsRes = await api.get('/documents');
      setDocuments(docsRes.data.data);
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
    if (file) handleUpload(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  // --- Format timestamp to "10m ago" style ---
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

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-3 gap-4">

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total Processed</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalProcessed}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Pending Review</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{pendingReview}</p>
          {pendingReview > 0 && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded bg-yellow-50 text-yellow-700 border border-yellow-200">
              REVIEW_REQUIRED
            </span>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Avg. AI Confidence</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{avgConfidence}%</p>
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

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-14 cursor-pointer transition-colors ${
              isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            <p className="text-sm font-medium text-gray-600">
              {uploading ? 'Uploading...' : 'Drop invoice or certificate here to process.'}
            </p>
            <p className="text-xs text-gray-400 mt-1">or click to select files</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/tiff,application/pdf"
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          {/* Status message */}
          {uploadMsg && (
            <p className={`mt-3 text-sm text-center ${uploadMsg.startsWith('✓') ? 'text-green-600' : 'text-gray-500'}`}>
              {uploadMsg}
            </p>
          )}
        </div>

        {/* Audit logs — 2/5 width */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm font-medium text-gray-700 mb-4">Recent Audit Logs</p>

          {auditLogs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${auditIconStyle(log.action)}`}>
                    {auditIconChar(log.action)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{log.document?.originalName}</p>
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
