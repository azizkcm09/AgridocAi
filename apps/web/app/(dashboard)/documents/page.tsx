'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading]     = useState(true);

  // Filter state
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter]     = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination state
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/documents')
      .then((res) => setDocuments(res.data))
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  // --- Client-side filtering ---
  // Every time search/filters change, reset to page 1
  const filtered = documents.filter((doc) => {
    const matchesSearch = doc.originalName.toLowerCase().includes(search.toLowerCase());
    const matchesType   = typeFilter   === 'ALL' || doc.type   === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Slice the filtered list for the current page
  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1); // reset to first page on new search
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-4">

      {/* Page title */}
      <h1 className="text-2xl font-bold text-gray-900">Documents</h1>

      {/* ── FILTERS ── */}
      <div className="flex items-center gap-3">

        {/* Search input */}
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

        {/* Document type filter */}
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">Document Type: All</option>
          <option value="INVOICE">Invoice</option>
          <option value="CERTIFICATE">Certificate</option>
          <option value="REPORT">Report</option>
          <option value="UNKNOWN">Unknown</option>
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
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
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  No documents found.
                </td>
              </tr>
            ) : (
              paginated.map((doc) => (
                <tr
                  key={doc.id}
                  onClick={() => router.push(`/documents/${doc.id}`)}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  {/* Checkbox — stop propagation so clicking it doesn't navigate */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="rounded" />
                  </td>

                  {/* File name — blue link style */}
                  <td className="px-4 py-3 text-blue-600 font-medium max-w-xs truncate">
                    {doc.originalName}
                  </td>

                  {/* Type — capitalize and remove underscores */}
                  <td className="px-4 py-3 text-gray-600 capitalize">
                    {doc.type.charAt(0) + doc.type.slice(1).toLowerCase()}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(doc.createdAt)}
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs ${STATUS_COLORS[doc.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {doc.status.charAt(0) + doc.status.slice(1).toLowerCase().replace(/_/g, ' ')}
                    </span>
                  </td>

                  {/* Actions menu placeholder */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button className="text-gray-400 hover:text-gray-600 px-2 py-1 rounded">
                      ⋮
                    </button>
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
          <span>Page {page} of {totalPages}</span>
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
