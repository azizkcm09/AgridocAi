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

  // watch('password') reads the current value of the password field in real time
  // We use it to validate that confirmPassword matches
  const password = watch('password');

  async function onSubmit(data: RegisterFormData) {
    setServerError(null);
    try {
      await api.post('/auth/register', {
        email: data.email,
        password: data.password,
      });
      // Registration successful — go to login
      router.push('/login');
    } catch (err: any) {
      // NestJS returns 409 if email already exists
      if (err.response?.status === 409) {
        setServerError('An account with this email already exists.');
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">

      {/* Logo icon */}
      <div className="flex justify-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
          <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M12 18c-3 0-5-2.5-5-6 3 0 5 2.5 5 6z" fill="currentColor" opacity="0.3" />
            <path d="M12 18c3 0 5-2.5 5-6-3 0-5 2.5-5 6z" fill="currentColor" opacity="0.3" />
          </svg>
        </div>
      </div>

      {/* Card */}
      <div className="backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-lg border border-gray-100/80 dark:border-gray-800/80 p-8">

        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Account</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started with AgriDoc AI</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' },
              })}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Min 6 characters' },
              })}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) => value === password || 'Passwords do not match',
              })}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <p className="text-sm text-red-500 text-center">{serverError}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        {/* Link to login */}
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
