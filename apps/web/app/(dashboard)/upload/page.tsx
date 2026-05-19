'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import axios from 'axios';
import { useToast } from '@/lib/toast-context';

// Document type is no longer chosen by the user — the AI service classifies
// every upload automatically and the user can override the result from the
// document detail page if the classifier guesses wrong.
const DETECTABLE_TYPES = ['Invoice', 'Certificate', 'Report', 'Other'];

const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const ACCEPT_ATTR   = 'image/png,image/jpeg,application/pdf';
const MAX_FILE_SIZE = 25 * 1024 * 1024;

// The backend's GenerateUrlDto rejects anything outside [a-zA-Z0-9_.-].
// Replace unsafe chars with "_" before requesting a presigned URL.
function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

type PendingFile = {
  id: string;
  file: File;
  status: UploadStatus;
  progress: string;
  error?: string;
};

export default function UploadPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [isDragging, setIsDragging]   = useState(false);
  const [pending, setPending]         = useState<PendingFile[]>([]);
  const [submitting, setSubmitting]   = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    const accepted: PendingFile[] = [];
    for (const file of incoming) {
      if (!ACCEPTED_MIME.includes(file.type)) {
        addToast(`${file.name}: unsupported file type.`, 'error');
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        addToast(`${file.name}: exceeds 25MB limit.`, 'error');
        continue;
      }
      accepted.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        status: 'idle',
        progress: '',
      });
    }
    if (accepted.length > 0) setPending((prev) => [...prev, ...accepted]);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) addFiles(e.target.files);
    e.target.value = '';
  }

  function removeFile(id: string) {
    setPending((prev) => prev.filter((p) => p.id !== id));
  }

  async function uploadOne(p: PendingFile) {
    const file = p.file;
    const setStatus = (status: UploadStatus, progress: string, error?: string) => {
      setPending((prev) => prev.map((it) => (it.id === p.id ? { ...it, status, progress, error } : it)));
    };

    setStatus('uploading', 'Requesting upload URL...');

    try {
      const safeName = sanitizeFileName(file.name);

      const urlRes = await api.post('/storage/presigned-url', {
        fileName: safeName,
        contentType: file.type,
      });
      const { uploadUrl, key } = urlRes.data;

      setStatus('uploading', 'Uploading file...');
      await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } });

      setStatus('uploading', 'Queuing for AI classification + extraction...');
      // Always send UNKNOWN — the AI service runs its classifier on the
      // first page and the API records the detected type on callback.
      await api.post('/documents', {
        originalName: file.name,
        storagePath: key,
        mimeType: file.type,
        size: file.size,
        type: 'UNKNOWN',
      });

      setStatus('success', 'Queued');
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setStatus('error', '', typeof msg === 'string' ? msg : 'Upload failed');
      return false;
    }
  }

  async function handleSubmit() {
    if (pending.length === 0 || submitting) return;
    setSubmitting(true);
    let ok = 0;
    let failed = 0;
    for (const p of pending) {
      if (p.status === 'success') continue;
      const result = await uploadOne(p);
      if (result) ok += 1; else failed += 1;
    }
    setSubmitting(false);
    if (ok > 0) addToast(`${ok} document(s) queued for extraction.`, 'success');
    if (failed > 0) addToast(`${failed} document(s) failed.`, 'error');
    if (failed === 0 && ok > 0) {
      setTimeout(() => router.push('/documents'), 600);
    }
  }

  function clearAll() {
    setPending([]);
  }

  const queueCount = pending.filter((p) => p.status !== 'success').length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Page title */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[color:var(--foreground)] tracking-tight">
          Upload Documents
        </h1>
        <p className="text-sm text-[color:var(--foreground-muted)] mt-1">
          Drop one or more files. OCR runs first, the AI classifies the document, then extracts its fields.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-800 p-6 space-y-5">

        <div className="flex items-start gap-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 px-4 py-3">
          <svg
            className="w-5 h-5 mt-0.5 text-slate-500 dark:text-slate-400 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 14a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <div className="flex-1 text-sm leading-relaxed">
            <p className="font-medium text-slate-700 dark:text-slate-200">
              The AI will detect the document type automatically.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supported categories:{' '}
              {DETECTABLE_TYPES.map((t, i) => (
                <span key={t}>
                  <span className="inline-flex items-center rounded-full bg-white dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">
                    {t}
                  </span>
                  {i < DETECTABLE_TYPES.length - 1 && <span className="mx-1 text-slate-300">·</span>}
                </span>
              ))}
              . You can correct the detected type from the document page after review.
            </p>
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => !submitting && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-[color:var(--brand)] bg-[color:var(--brand-soft)]'
              : 'border-[color:var(--border-strong)] hover:border-[color:var(--brand)] hover:bg-[color:var(--surface-muted)]'
          } ${submitting ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.9A5 5 0 0117.9 8a4.5 4.5 0 01-.4 8.94M12 12v9m0 0l-3-3m3 3l3-3" />
          </svg>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Drop files here or click to browse
          </p>
          <p className="text-xs text-slate-400 mt-1">PDF, JPEG, PNG · max 25MB each</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        {pending.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Queue ({pending.length})
              </p>
              {!submitting && (
                <button
                  onClick={clearAll}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Clear all
                </button>
              )}
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-md">
              {pending.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 dark:text-slate-200 truncate">{p.file.name}</p>
                    <p className="text-xs text-slate-400">
                      {formatBytes(p.file.size)}
                      {p.status === 'uploading' && p.progress && (
                        <span className="ml-2 text-indigo-500">· {p.progress}</span>
                      )}
                      {p.status === 'success' && (
                        <span className="ml-2 text-emerald-600 dark:text-emerald-400">· Queued</span>
                      )}
                      {p.status === 'error' && (
                        <span className="ml-2 text-rose-500">· {p.error}</span>
                      )}
                    </p>
                  </div>
                  {p.status === 'idle' && !submitting && (
                    <button
                      onClick={() => removeFile(p.id)}
                      className="text-slate-400 hover:text-rose-500 transition-colors"
                      aria-label="Remove file"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {p.status === 'uploading' && (
                    <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {p.status === 'success' && (
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {p.status === 'error' && (
                    <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
                    </svg>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/documents')}
            disabled={submitting}
            className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || queueCount === 0}
            className="flex-1 py-2 bg-[color:var(--brand)] text-[color:var(--brand-contrast)] text-sm font-medium rounded-md hover:bg-[color:var(--brand-strong)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Uploading...' : queueCount > 0 ? `Upload ${queueCount} document${queueCount > 1 ? 's' : ''}` : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
