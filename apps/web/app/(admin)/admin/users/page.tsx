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
  const [users, setUsers]       = useState<User[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // userId being mutated

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchUsers = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/users?page=${p}&limit=${PAGE_SIZE}`);
      setUsers(res.data.data);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(page); }, [page, fetchUsers]);

  async function handleToggleRole(user: User) {
    setActionLoading(user.id);
    try {
      const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
      await api.patch(`/admin/users/${user.id}/role`, { role: newRole });
      addToast(`${user.email} is now ${newRole}`, 'success');
      fetchUsers(page);
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
      addToast(`${user.email} ${user.isActive ? 'deactivated' : 'activated'}`, 'success');
      fetchUsers(page);
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{total} registered users on the platform.</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">User</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Role</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Docs</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Joined</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
            ) : users.length === 0 ? (
              <tr><td colSpan={6}>
                <EmptyState
                  icon={<svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                  title="No users found"
                  description="No registered users yet."
                />
              </td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{user.name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    user.role === 'ADMIN'
                      ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    user.isActive
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{user._count.documents}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(user.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {/* Toggle role */}
                    <button
                      onClick={() => handleToggleRole(user)}
                      disabled={actionLoading === user.id}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {actionLoading === user.id ? '...' : user.role === 'ADMIN' ? 'Demote' : 'Promote'}
                    </button>
                    {/* Toggle active */}
                    <button
                      onClick={() => handleToggleActive(user)}
                      disabled={actionLoading === user.id + '-active'}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
                        user.isActive
                          ? 'border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : 'border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                    >
                      {actionLoading === user.id + '-active' ? '...' : user.isActive ? 'Deactivate' : 'Activate'}
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
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">›</button>
          </div>
        </div>
      )}
    </div>
  );
}
