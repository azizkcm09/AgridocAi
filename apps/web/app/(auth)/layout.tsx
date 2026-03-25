'use client';

import { ThemeProvider, useTheme } from '@/lib/theme-context';
import AuthBrandingPanel from '@/components/AuthBrandingPanel';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

function AuthLayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left: Branding panel (desktop only) */}
      <AuthBrandingPanel />

      {/* Right: Form panel */}
      <div className="relative w-full lg:w-2/5 flex flex-col bg-gray-50 dark:bg-gray-950">
        <ThemeToggle />

        {/* Mobile header (hidden on desktop) */}
        <div className="lg:hidden flex items-center gap-3 px-6 pt-8 pb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M12 18c-3 0-5-2.5-5-6 3 0 5 2.5 5 6z" fill="currentColor" opacity="0.3" />
              <path d="M12 18c3 0 5-2.5 5-6-3 0-5 2.5-5 6z" fill="currentColor" opacity="0.3" />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">AgriDoc AI</span>
        </div>

        {/* Form content — vertically centered */}
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthLayoutInner>{children}</AuthLayoutInner>
    </ThemeProvider>
  );
}
