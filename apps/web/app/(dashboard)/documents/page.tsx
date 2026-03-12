'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

type Document = {
  id: string;
  originalName: string;
  type: string;
  status: string;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:          'bg-gray-100 text-gray-600',
  PROCESSING:       'bg-blue-50 text-blue-600',
  REVIEW_REQUIRED:  'bg-yellow-50 text-yellow-700',
  VALIDATED:        'bg-green-50 text-green-700',
  REJECTED:         'bg-red-50 text-red-600',
  ERROR:            'bg-red-100 text-red-700 font-semibold',
};

const PAGE_SIZE = 8;

export default function DocumentsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);

  // Filter + pagination state
  // Read initial search value from URL query param (set by the header search bar)
  const [search, setSearch]             = useState(searchParams.get('search') ?? '');
  const [typeFilter, setTypeFilter]     = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage]                 = useState(1);

  // Tracks which row's dropdown is open — stores the document id, or null if none
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // fetchDocuments is called every time page or filters change
  // useCallback prevents it from being recreated on every render
  const fetchDocuments = useCallback(async (
    currentPage: number,
    currentSearch: string,
    currentType: string,
    currentStatus: string,
  ) => {
    setLoading(true);
    try {
      // Build query string — only include filters that are actually set
      const params = new URLSearchParams();
      params.set('page',  String(currentPage));
      params.set('limit', String(PAGE_SIZE));
      if (currentSearch)              params.set('search', currentSearch);
      if (currentType   !== 'ALL')    params.set('type',   currentType);
      if (currentStatus !== 'ALL')    params.set('status', currentStatus);

      // GET /documents?page=1&limit=8&type=INVOICE&...
      const res = await api.get(`/documents?${params.toString()}`);
      setDocuments(res.data.data);   // the page of results
      setTotal(res.data.total);      // total matching rows (for page count)
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Re-fetch whenever page, search, type, or status changes
  useEffect(() => {
    fetchDocuments(page, search, typeFilter, statusFilter);
  }, [page, search, typeFilter, statusFilter, fetchDocuments]);

  // When filters change, always go back to page 1
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

  async function handleDelete(docId: string) {
    if (!confirm('Delete this document? This action cannot be undone.')) return;
    try {
      await api.delete(`/documents/${docId}`);
      // Re-fetch current page — document is gone from the list
      fetchDocuments(page, search, typeFilter, statusFilter);
    } catch {
      alert('Failed to delete document.');
    } finally {
      setOpenMenu(null);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  }

  return (
    <div className="space-y-4">

      {/* Page title */}
      <h1 className="text-2xl font-bold text-gray-900">Documents</h1>

      {/* ── FILTERS ── */}
      <div className="flex items-center gap-3">

        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Filename..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">Document Type: All</option>
          <option value="INVOICE">Invoice</option>
          <option value="CERTIFICATE">Certificate</option>
          <option value="REPORT">Report</option>
          <option value="UNKNOWN">Unknown</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* ── TABLE ── */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-4 py-3 font-medium text-gray-500 w-8">
                <input type="checkbox" className="rounded" />
              </th>
              <th className="px-4 py-3 font-medium text-gray-500">Document Name</th>
              <th className="px-4 py-3 font-medium text-gray-500">Type</th>
              <th className="px-4 py-3 font-medium text-gray-500">Upload Date</th>
              <th className="px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">No documents found.</td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr
                  key={doc.id}
                  onClick={() => router.push(`/documents/${doc.id}`)}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="rounded" />
                  </td>
                  <td className="px-4 py-3 text-blue-600 font-medium max-w-xs truncate">
                    {doc.originalName}
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">
                    {doc.type.charAt(0) + doc.type.slice(1).toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs ${STATUS_COLORS[doc.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {doc.status.charAt(0) + doc.status.slice(1).toLowerCase().replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 relative" onClick={(e) => e.stopPropagation()}>
                    {/* Toggle button */}
                    <button
                      onClick={() => setOpenMenu(openMenu === doc.id ? null : doc.id)}
                      className="text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
                    >
                      ⋮
                    </button>

                    {/* Dropdown — only rendered for the row whose id matches openMenu */}
                    {openMenu === doc.id && (
                      <div className="absolute right-4 top-10 z-10 bg-white border border-gray-100 rounded-lg shadow-md w-36 py-1">
                        <button
                          onClick={() => { setOpenMenu(null); router.push(`/documents/${doc.id}`); }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          View
                        </button>
                        {doc.status === 'REVIEW_REQUIRED' && (
                          <button
                            onClick={() => { setOpenMenu(null); router.push(`/documents/${doc.id}`); }}
                            className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                          >
                            Validate
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
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

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page} of {totalPages} · {total} total</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
