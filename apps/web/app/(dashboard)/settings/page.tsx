'use client';

import { useEffect, useState } from 'react';
import { getUserEmail } from '@/lib/auth';
import api from '@/lib/api';

type HealthStatus = {
  database: 'connected' | 'disconnected';
  ai: 'connected' | 'disconnected';
};

export default function SettingsPage() {
  const [email, setEmail]       = useState<string | null>(null);
  const [health, setHealth]     = useState<HealthStatus | null>(null);
  const [checking, setChecking] = useState(true);

  function checkHealth() {
    setChecking(true);
    api.get('/health')
      .then((res) => setHealth(res.data))
      .catch(() => setHealth({ database: 'disconnected', ai: 'disconnected' }))
      .finally(() => setChecking(false));
  }

  useEffect(() => {
    setEmail(getUserEmail());
    checkHealth();
  }, []);

  function StatusBadge({ status }: { status: 'connected' | 'disconnected' | 'checking' }) {
    if (status === 'checking') {
      return (
        <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5">
          Checking...
        </span>
      );
    }
    if (status === 'connected') {
      return (
        <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-lg px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Connected
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-lg px-3 py-1.5">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        Disconnected
      </span>
    );
  }

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account and monitor system health.</p>
      </div>

      {/* Account section */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        <div className="p-5">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Account</h2>
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email address</p>
            <p className="text-xs text-gray-400 mt-0.5">Your login email</p>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5">
            {email ?? '—'}
          </span>
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Role</p>
            <p className="text-xs text-gray-400 mt-0.5">Your access level</p>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5">
            Operator
          </span>
        </div>
      </div>

      {/* System health section */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        <div className="p-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">System Health</h2>
          <button
            onClick={checkHealth}
            disabled={checking}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors disabled:opacity-50"
          >
            {checking ? 'Checking...' : 'Refresh'}
          </button>
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">API</p>
            <p className="text-xs text-gray-400 mt-0.5">NestJS backend</p>
          </div>
          <StatusBadge status={health ? 'connected' : (checking ? 'checking' : 'disconnected')} />
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Database</p>
            <p className="text-xs text-gray-400 mt-0.5">PostgreSQL via Prisma</p>
          </div>
          <StatusBadge status={checking ? 'checking' : (health?.database ?? 'disconnected')} />
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Service</p>
            <p className="text-xs text-gray-400 mt-0.5">FastAPI OCR worker</p>
          </div>
          <StatusBadge status={checking ? 'checking' : (health?.ai ?? 'disconnected')} />
        </div>
      </div>

      {/* About section */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        <div className="p-5">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">About</h2>
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Version</p>
            <p className="text-xs text-gray-400 mt-0.5">Current application version</p>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5">
            1.0.0
          </span>
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Stack</p>
            <p className="text-xs text-gray-400 mt-0.5">Core technologies</p>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5">
            Next.js + NestJS + FastAPI
          </span>
        </div>
      </div>
    </div>
  );
}
