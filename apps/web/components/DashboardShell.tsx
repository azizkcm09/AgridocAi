'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import { isAuthenticated, clearToken, getUserEmail } from '@/lib/auth';
import { useTheme } from '@/lib/theme-context';

// --- Navigation items ---
const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    label: 'Documents',
    href: '/documents',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: 'Audit Logs',
    href: '/audit',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

// --- Main component ---
export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail]     = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Poll for documents needing review every 15s
  const { data: reviewData } = useSWR<{ data: { id: string; originalName: string; createdAt: string }[] }>(
    mounted ? '/documents?status=REVIEW_REQUIRED&limit=5' : null,
    fetcher,
    { refreshInterval: 15000 },
  );

  const reviewDocs = reviewData?.data ?? [];

  // Track seen document IDs — React state + localStorage for persistence
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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // useEffect only runs in the browser, never on the server.
  // We set mounted=true here so the server and client first render both return null,
  // preventing the hydration mismatch React was complaining about.
  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    setEmail(getUserEmail());
  }, [router]);

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  // When the user presses Enter in the header search, navigate to the documents
  // page with the search term as a query param — the documents page reads it automatically
  function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const query = e.currentTarget.value.trim();
      if (query) {
        router.push(`/documents?search=${encodeURIComponent(query)}`);
      } else {
        router.push('/documents');
      }
    }
  }

  // Return null until the browser has mounted — matches the server render exactly
  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className="w-64 shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col">

        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-800">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">AgriDoc-Ai</span>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            // A link is "active" if the current URL starts with its href
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout button — pinned to the bottom */}
        <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* ── RIGHT SIDE: Header + Page content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top header */}
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 shrink-0">
          {/* Search bar — hidden on /documents since that page has its own search */}
          <div className={`relative w-80 ${pathname.startsWith('/documents') ? 'invisible' : ''}`}>
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              onKeyDown={handleSearch}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notification bell + Theme toggle + User info */}
          <div className="flex items-center gap-3">

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Bell */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {bellOpen && (
                <div className="absolute right-0 top-10 w-80 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Ready for Review</p>
                    {reviewDocs.length > 0 && (
                      <button onClick={markAllRead} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">
                        Mark all as read
                      </button>
                    )}
                  </div>
                  {reviewDocs.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No documents pending review.</p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {reviewDocs.map((doc) => {
                        const isRead = seenIds.includes(doc.id);
                        return (
                          <div
                            key={doc.id}
                            className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 transition-all ${isRead ? 'opacity-50 hover:opacity-100' : ''} hover:bg-gray-50 dark:hover:bg-gray-800`}
                          >
                            <button
                              onClick={() => { markOneRead(doc.id); router.push(`/documents/${doc.id}`); setBellOpen(false); }}
                              className="flex items-center gap-3 flex-1 min-w-0 text-left"
                            >
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isRead ? 'bg-gray-50 dark:bg-gray-800' : 'bg-yellow-50 dark:bg-yellow-900/30'}`}>
                                <svg className={`w-3.5 h-3.5 ${isRead ? 'text-gray-400' : 'text-yellow-600 dark:text-yellow-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{doc.originalName}</p>
                                <p className="text-xs text-gray-400">
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
                                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
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

            {/* User avatar */}
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">{email ?? 'user@example.com'}</span>
          </div>
        </header>

        {/* Page content — scrollable */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
