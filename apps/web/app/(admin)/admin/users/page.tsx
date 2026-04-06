'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { TableRowSkeleton } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/lib/toast-context';

type User = {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  _count: { documents: number };
};

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const { addToast } = useToast();
  const [users, setUsers]     = useState<User[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchUsers = useCallback(async (p: number, s: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', String(PAGE_SIZE));
      if (s) params.set('search', s);
      const res = await api.get(`/admin/users?${params.toString()}`);
      setUsers(res.data.data);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(page, search); }, [page, search, fetchUsers]);

  async function handleToggleRole(user: User) {
    setActionLoading(user.id);
    try {
      const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
      await api.patch(`/admin/users/${user.id}/role`, { role: newRole });
      addToast(`${user.email} promoted to ${newRole}`, 'success');
      fetchUsers(page, search);
    } catch {
      addToast('Failed to update role', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleActive(user: User) {
    setActionLoading(user.id + '-active');
    try {
      await api.patch(`/admin/users/${user.id}/deactivate`);
      addToast(`${user.email} ${user.isActive ? 'deactivated' : 'reactivated'}`, 'success');
      fetchUsers(page, search);
    } catch {
      addToast('Failed to update status', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} registered accounts on the platform.</p>
        </div>
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded pl-8 pr-3 py-1.5 bg-white text-slate-700 w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-slate-900/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Account</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Role</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Docs</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Joined</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
            ) : users.length === 0 ? (
              <tr><td colSpan={6}>
                <EmptyState
                  icon={<svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                  title="No users found"
                  description="No registered users yet."
                />
              </td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                {/* Account */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-slate-500">
                        {(user.name ?? user.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-800">{user.name ?? '—'}</p>
                      <p className="text-[11px] text-slate-400">{user.email}</p>
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                    user.role === 'ADMIN'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {user.role}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="text-xs text-slate-500">{user.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </td>

                {/* Doc count */}
                <td className="px-4 py-3 text-xs text-slate-500">{user._count.documents}</td>

                {/* Joined */}
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{formatDate(user.createdAt)}</td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleRole(user)}
                      disabled={actionLoading === user.id}
                      className="px-2.5 py-1 text-[11px] font-medium rounded border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {actionLoading === user.id ? '…' : user.role === 'ADMIN' ? 'Demote' : 'Promote'}
                    </button>
                    <button
                      onClick={() => handleToggleActive(user)}
                      disabled={actionLoading === user.id + '-active'}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded border disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
                        user.isActive
                          ? 'border-red-200 text-red-600 bg-white hover:bg-red-50'
                          : 'border-emerald-200 text-emerald-600 bg-white hover:bg-emerald-50'
                      }`}
                    >
                      {actionLoading === user.id + '-active' ? '…' : user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{total} accounts · Page {page} of {totalPages}</span>
          <div className="flex gap-1.5">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Prev</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
