'use client';

import { useEffect, useState, useRef } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import fetcher from '@/lib/fetcher';
import { getUserEmail } from '@/lib/auth';
import { useToast } from '@/lib/toast-context';
import axios from 'axios';

type Profile = {
  id: string;
  email: string;
  name: string | null;
  avatarPath: string | null;
  createdAt: string;
};

type Activity = {
  uploaded: number;
  validated: number;
};

type HealthStatus = {
  database: 'connected' | 'disconnected';
  ai: 'connected' | 'disconnected';
};

export default function SettingsPage() {
  const { addToast } = useToast();

  // Profile data from API
  const { data: profile, mutate: mutateProfile } = useSWR<Profile>('/users/profile', fetcher);
  const { data: activity } = useSWR<Activity>('/users/activity', fetcher);

  // Profile form state
  const [name, setName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // System health
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [checking, setChecking] = useState(true);

  // Sync profile data into form when loaded
  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      // Get presigned download URL for avatar if it exists
      if (profile.avatarPath) {
        api.get('/storage/download-url', { params: { key: profile.avatarPath } })
          .then((res) => setAvatarUrl(res.data.downloadUrl))
          .catch(() => {});
      }
    }
  }, [profile]);

  // Health check on mount
  useEffect(() => {
    checkHealth();
  }, []);

  function checkHealth() {
    setChecking(true);
    api.get('/health')
      .then((res) => setHealth(res.data))
      .catch(() => setHealth({ database: 'disconnected', ai: 'disconnected' }))
      .finally(() => setChecking(false));
  }

  // Save profile (name)
  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      await api.patch('/users/profile', { name: name.trim() || null });
      mutateProfile();
      addToast('Profile updated.', 'success');
    } catch {
      addToast('Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  // Avatar upload: get presigned URL → upload to MinIO → confirm path
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (e.target) e.target.value = '';

    setUploadingAvatar(true);
    try {
      // 1. Get presigned upload URL
      const urlRes = await api.post('/users/avatar', {
        fileName: file.name,
        contentType: file.type,
      });
      const { uploadUrl, key } = urlRes.data;

      // 2. Upload directly to MinIO
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
      });

      // 3. Confirm the avatar path in the database
      await api.patch('/users/avatar', { avatarPath: key });

      // 4. Refresh profile to get the new avatar
      mutateProfile();
      addToast('Avatar updated.', 'success');
    } catch {
      addToast('Failed to upload avatar.', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  }

  // Change password
  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      addToast('New password must be at least 6 characters.', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await api.post('/users/change-password', {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast('Password changed successfully.', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      addToast(typeof msg === 'string' ? msg : 'Failed to change password.', 'error');
    } finally {
      setChangingPassword(false);
    }
  }

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

  const email = profile?.email ?? getUserEmail() ?? '—';

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account and monitor system health.</p>
      </div>

      {/* ── Profile Section ── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-5">Profile</h2>

        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="shrink-0">
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors group"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-8 h-8 text-gray-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            {uploadingAvatar && <p className="text-xs text-gray-400 mt-1 text-center">Uploading...</p>}
          </div>

          {/* Name + Email fields */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your display name"
                className="w-full max-w-sm px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full max-w-sm px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-500 cursor-not-allowed"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50 transition-colors"
            >
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Activity Summary ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Docs uploaded this month</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{activity?.uploaded ?? 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Docs validated this month</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{activity?.validated ?? 0}</p>
        </div>
      </div>

      {/* ── Password Change Section ── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-5">Change Password</h2>
        <div className="space-y-4 max-w-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            {changingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>

      {/* ── System Health ── */}
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

      {/* ── About ── */}
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
