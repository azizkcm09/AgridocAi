'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import api from '@/lib/api';
import fetcher from '@/lib/fetcher';
import { useToast } from '@/lib/toast-context';
import Modal from '@/components/Modal';

type Document = {
  id: string;
  originalName: string;
  type: string;
  status: string;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:          'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  PROCESSING:       'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  REVIEW_REQUIRED:  'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  VALIDATED:        'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  REJECTED:         'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  ERROR:            'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 font-semibold',
};

const PAGE_SIZE = 8;

// Build the SWR key from current filters
function buildKey(page: number, search: string, type: string, status: string) {
  const params = new URLSearchParams();
  params.set('page',  String(page));
  params.set('limit', String(PAGE_SIZE));
  if (search)          params.set('search', search);
  if (type   !== 'ALL') params.set('type',   type);
  if (status !== 'ALL') params.set('status', status);
  return `/documents?${params.toString()}`;
}

export default function DocumentsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch]             = useState(searchParams.get('search') ?? '');
  const [typeFilter, setTypeFilter]     = useState('ALL');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'ALL');
  const [page, setPage]                 = useState(1);

  const { addToast } = useToast();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // SWR: fetch documents with caching per filter combination
  const swrKey = buildKey(page, search, typeFilter, statusFilter);
  const { data, isLoading, mutate } = useSWR<{ data: Document[]; total: number }>(swrKey, fetcher);

  const documents = data?.data ?? [];
  const total     = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenu]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }
  function handleTypeChange(value: string) {
    setTypeFilter(value);
    setPage(1);
  }
  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/documents/${deleteTarget.id}`);
      setDeleteTarget(null);
      mutate();
    } catch {
      // keep modal open so user sees something went wrong
    } finally {
      setDeleting(false);
    }
  }

  async function handleExport(doc: Document) {
    setOpenMenu(null);
    try {
      const res = await api.get(`/documents/${doc.id}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agridoc-report-${doc.id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      addToast('PDF exported successfully.', 'success');
    } catch {
      addToast('Failed to export PDF.', 'error');
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  }

  function dropdownPosition(index: number) {
    const isNearBottom = index >= documents.length - 2;
    return isNearBottom ? 'bottom-10' : 'top-10';
  }

  return (
    <div className="space-y-4">

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Documents</h1>

      {/* -- FILTERS -- */}
      <div className="flex items-center gap-3">

        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by filename..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">Type: All</option>
          <option value="INVOICE">Invoice</option>
          <option value="CERTIFICATE">Certificate</option>
          <option value="REPORT">Report</option>
          <option value="UNKNOWN">Unknown</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">Status: All</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="REVIEW_REQUIRED">Review Required</option>
          <option value="VALIDATED">Validated</option>
          <option value="REJECTED">Rejected</option>
          <option value="ERROR">Error</option>
        </select>
      </div>

      {/* -- TABLE -- */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-visible">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Document Name</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Upload Date</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 w-16">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">Loading...</td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">
                  No documents found.
                </td>
              </tr>
            ) : (
              documents.map((doc, index) => (
                <tr
                  key={doc.id}
                  onClick={() => router.push(`/documents/${doc.id}`)}
                  className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-medium max-w-xs truncate">
                    {doc.originalName}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">
                    {doc.type.charAt(0) + doc.type.slice(1).toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs ${STATUS_COLORS[doc.status] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                      {doc.status.charAt(0) + doc.status.slice(1).toLowerCase().replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenMenu(openMenu === doc.id ? null : doc.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      ⋮
                    </button>

                    {openMenu === doc.id && (
                      <div
                        ref={menuRef}
                        className={`absolute right-4 ${dropdownPosition(index)} z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-36 py-1`}
                      >
                        <button
                          onClick={() => { setOpenMenu(null); router.push(`/documents/${doc.id}`); }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          View
                        </button>
                        {doc.status === 'REVIEW_REQUIRED' && (
                          <button
                            onClick={() => { setOpenMenu(null); router.push(`/documents/${doc.id}`); }}
                            className="w-full text-left px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                          >
                            Validate
                          </button>
                        )}
                        {doc.status === 'VALIDATED' && (
                          <button
                            onClick={() => handleExport(doc)}
                            className="w-full text-left px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30"
                          >
                            Export
                          </button>
                        )}
                        <button
                          onClick={() => { setOpenMenu(null); setDeleteTarget(doc); }}
                          className="w-full text-left px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Document">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Are you sure you want to delete <span className="font-medium text-gray-800 dark:text-gray-200">{deleteTarget?.originalName}</span>?
        </p>
        <p className="text-xs text-gray-400 mb-5">This document will be removed from your list. Audit logs are preserved.</p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteTarget(null)}
            className="flex-1 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            disabled={deleting}
            className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Page {page} of {totalPages} · {total} total</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
