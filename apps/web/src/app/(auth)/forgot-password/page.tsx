'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, ForgotPasswordInput } from '@bizmanage/validation';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', data);
      if (res.data.success) {
        setMessage(res.data.data.message);
        if (res.data.data.resetToken) {
          setResetToken(res.data.data.resetToken);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-xl bg-blue-600 items-center justify-center font-bold text-xl text-white mb-3">
            B
          </div>
          <h2 className="text-2xl font-bold text-white">Reset Password</h2>
          <p className="text-sm text-slate-400 mt-1">Enter your registered email address to receive password reset instructions</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm space-y-3">
            <p>{message}</p>
            {resetToken && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 break-all">
                <p className="text-slate-400 font-sans mb-1">Development Reset Link:</p>
                <Link href={`/reset-password?token=${resetToken}`} className="text-blue-400 underline">
                  /reset-password?token={resetToken}
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="user@business.com"
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
          >
            {loading ? 'Sending Instructions...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-400">
          Remembered your password?{' '}
          <Link href="/login" className="text-blue-400 hover:underline font-medium">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
