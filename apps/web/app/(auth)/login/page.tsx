'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { setToken, getUserRole } from '@/lib/auth';

type LoginFormData = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>();

  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    try {
      const response = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });
      setToken(response.data.access_token);
      router.push(getUserRole() === 'ADMIN' ? '/admin' : '/dashboard');
    } catch {
      setServerError('Invalid email or password.');
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">

      {/* Logo */}
      <div className="flex justify-center mb-8">
        <img src="/logo.png" alt="AgriDoc" className="w-11 h-11" />
      </div>

      {/* Card */}
      <div className="card-accent bg-[color:var(--surface)] rounded-lg shadow-sm ring-1 ring-[color:var(--border)] p-8">

        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-semibold text-[color:var(--foreground)] tracking-tight">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-[color:var(--foreground-muted)]">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="field-input"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' },
              })}
            />
            {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              className="field-input"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Min 6 characters' },
              })}
            />
            {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password.message}</p>}
          </div>

          {serverError && (
            <div className="text-sm text-rose-600 dark:text-rose-400 text-center bg-rose-50 dark:bg-rose-900/20 rounded-md py-2 px-3 ring-1 ring-rose-200 dark:ring-rose-800">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-[color:var(--brand)] text-[color:var(--brand-contrast)] text-sm font-medium rounded-md hover:bg-[color:var(--brand-strong)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[color:var(--foreground-muted)]">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[color:var(--brand)] hover:text-[color:var(--brand-strong)] font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
