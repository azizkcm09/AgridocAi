'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

type RegisterFormData = {
  email: string;
  password: string;
  confirmPassword: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  async function onSubmit(data: RegisterFormData) {
    setServerError(null);
    try {
      await api.post('/auth/register', {
        email: data.email,
        password: data.password,
      });
      router.push('/login');
    } catch (err: any) {
      if (err.response?.status === 409) {
        setServerError('An account with this email already exists.');
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">

      <div className="flex justify-center mb-8">
        <img src="/logo.png" alt="AgriDoc" className="w-11 h-11" />
      </div>

      <div className="card-accent bg-[color:var(--surface)] rounded-lg shadow-sm ring-1 ring-[color:var(--border)] p-8">

        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-semibold text-[color:var(--foreground)] tracking-tight">
            Create account
          </h1>
          <p className="mt-1 text-sm text-[color:var(--foreground-muted)]">Get started with AgriDoc</p>
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
              placeholder="Min 6 characters"
              className="field-input"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Min 6 characters' },
              })}
            />
            {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm password</label>
            <input
              type="password"
              placeholder="Re-enter your password"
              className="field-input"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) => value === password || 'Passwords do not match',
              })}
            />
            {errors.confirmPassword && <p className="mt-1 text-xs text-rose-500">{errors.confirmPassword.message}</p>}
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
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[color:var(--foreground-muted)]">
          Already have an account?{' '}
          <Link href="/login" className="text-[color:var(--brand)] hover:text-[color:var(--brand-strong)] font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
