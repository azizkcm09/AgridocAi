'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import api from '@/lib/api';
import { isAuthenticated, clearToken, getUserEmail, getUserName, getUserRole } from '@/lib/auth';
import { useTheme } from '@/lib/theme-context';

const NAV_ITEMS = [
  {
    section: 'MAIN',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        ),
      },
      {
        label: 'Documents',
        href: '/documents',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'SYSTEM',
    items: [
      {
        label: 'Audit Logs',
        href: '/audit',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        label: 'Settings',
        href: '/settings',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
    ],
  },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail]     = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const { data: profileData } = useSWR<{ id: string; email: string; name: string | null; avatarPath: string | null }>(
    mounted ? '/users/profile' : null,
    fetcher,
  );

  useEffect(() => {
    if (profileData?.avatarPath) {
      api.get('/storage/download-url', { params: { key: profileData.avatarPath } })
        .then((res) => setAvatarUrl(res.data.downloadUrl))
        .catch(() => setAvatarUrl(null));
    } else {
      setAvatarUrl(null);
    }
  }, [profileData?.avatarPath]);

  const { data: reviewData } = useSWR<{ data: { id: string; originalName: string; createdAt: string }[] }>(
    mounted ? '/documents?status=REVIEW_REQUIRED&limit=5' : null,
    fetcher,
    { refreshInterval: 15000 },
  );

  const reviewDocs = reviewData?.data ?? [];
  const seenKey = 'notif-seen-ids';
  const [seenIds, setSeenIds] = useState<string[]>(() =>
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(seenKey) ?? '[]') : [],
  );
  const unreadCount = reviewDocs.filter((d) => !seenIds.includes(d.id)).length;

  function markOneRead(id: string) {
    setSeenIds((prev) => {
      const updated = [...new Set([...prev, id])];
      localStorage.setItem(seenKey, JSON.stringify(updated));
      return updated;
    });
  }

  function markAllRead() {
    const allIds = reviewDocs.map((d) => d.id);
    setSeenIds(allIds);
    localStorage.setItem(seenKey, JSON.stringify(allIds));
    setBellOpen(false);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) { router.replace('/login'); return; }
    if (getUserRole() === 'ADMIN') { router.replace('/admin'); return; }
    setEmail(getUserEmail());
  }, [router]);

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const query = e.currentTarget.value.trim();
      router.push(query ? `/documents?search=${encodeURIComponent(query)}` : '/documents');
    }
  }

  if (!mounted) return null;

  const displayName = profileData?.name ?? getUserName() ?? email ?? 'User';

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className="w-60 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">

        {/* Brand */}
        <div className="h-14 flex items-center px-5 border-b border-slate-100 dark:border-slate-800">
          <img src="/full-logo.png" alt="AgriDoc" className="h-8" />
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {NAV_ITEMS.map((group) => (
            <div key={group.section}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {group.section}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <span className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-7 h-7 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{displayName}</p>
              <p className="text-[10px] text-slate-400 truncate">{email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── RIGHT: Header + Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0">
          <div className={`relative w-72 ${pathname.startsWith('/documents') ? 'invisible' : ''}`}>
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search documents..."
              onKeyDown={handleSearch}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Bell */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-10 w-80 bg-white dark:bg-slate-900 rounded-lg shadow-xl ring-1 ring-slate-900/5 dark:ring-slate-700 z-50 overflow-hidden animate-scale-in">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ready for Review</p>
                    {reviewDocs.length > 0 && (
                      <button onClick={markAllRead} className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium">
                        Mark all read
                      </button>
                    )}
                  </div>
                  {reviewDocs.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">No documents pending review.</p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {reviewDocs.map((doc) => {
                        const isRead = seenIds.includes(doc.id);
                        return (
                          <div
                            key={doc.id}
                            className={`flex items-center gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-800 last:border-0 transition-all ${isRead ? 'opacity-50 hover:opacity-100' : ''} hover:bg-slate-50 dark:hover:bg-slate-800`}
                          >
                            <button
                              onClick={() => { markOneRead(doc.id); router.push(`/documents/${doc.id}`); setBellOpen(false); }}
                              className="flex items-center gap-3 flex-1 min-w-0 text-left"
                            >
                              <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${isRead ? 'bg-slate-100 dark:bg-slate-800' : 'bg-amber-50 dark:bg-amber-900/30'}`}>
                                <svg className={`w-3.5 h-3.5 ${isRead ? 'text-slate-400' : 'text-amber-600 dark:text-amber-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-800 dark:text-slate-200 truncate">{doc.originalName}</p>
                                <p className="text-xs text-slate-400">
                                  {(() => {
                                    const diff = Date.now() - new Date(doc.createdAt).getTime();
                                    const mins = Math.floor(diff / 60000);
                                    if (mins < 1) return 'just now';
                                    if (mins < 60) return `${mins}m ago`;
                                    const hrs = Math.floor(mins / 60);
                                    if (hrs < 24) return `${hrs}h ago`;
                                    return `${Math.floor(hrs / 24)}d ago`;
                                  })()}
                                </p>
                              </div>
                            </button>
                            {!isRead && (
                              <button
                                onClick={(e) => { e.stopPropagation(); markOneRead(doc.id); }}
                                title="Mark as read"
                                className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

            {/* User avatar */}
            <Link href="/settings" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium hidden xl:block">
                {displayName}
              </span>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
