'use client';

import { useEffect, useState } from 'react';
import { getUserEmail } from '@/lib/auth';

export default function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null);

  // getUserEmail() reads from localStorage — must run in the browser, not on the server
  useEffect(() => {
    setEmail(getUserEmail());
  }, []);

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account preferences.</p>
      </div>

      {/* Account section */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">

        <div className="p-5">
          <h2 className="text-sm font-semibold text-gray-800">Account</h2>
        </div>

        {/* Email row */}
        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Email address</p>
            <p className="text-xs text-gray-400 mt-0.5">Your login email</p>
          </div>
          <span className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            {email ?? '—'}
          </span>
        </div>

        {/* Role row */}
        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Role</p>
            <p className="text-xs text-gray-400 mt-0.5">Your access level</p>
          </div>
          <span className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            Operator
          </span>
        </div>

      </div>

      {/* System section */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">

        <div className="p-5">
          <h2 className="text-sm font-semibold text-gray-800">System</h2>
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">API</p>
            <p className="text-xs text-gray-400 mt-0.5">NestJS backend</p>
          </div>
          <span className="text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-1.5">
            Connected
          </span>
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">AI Service</p>
            <p className="text-xs text-gray-400 mt-0.5">FastAPI OCR worker</p>
          </div>
          <span className="text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-1.5">
            Connected
          </span>
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Storage</p>
            <p className="text-xs text-gray-400 mt-0.5">MinIO S3-compatible</p>
          </div>
          <span className="text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-1.5">
            Connected
          </span>
        </div>

      </div>

    </div>
  );
}
