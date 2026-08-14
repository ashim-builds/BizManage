'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, ResetPasswordInput } from '@bizmanage/validation';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams?.get('token') || '';

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: tokenParam,
    },
  });

  useEffect(() => {
    if (tokenParam) {
      setValue('token', tokenParam);
    }
  }, [tokenParam, setValue]);

  const onSubmit = async (data: ResetPasswordInput) => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', data);
      if (res.data.success) {
        setMessage(res.data.data.message);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to reset password. Token may be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
      <div className="text-center mb-8">
        <Link href="/" onClick={() => window.scrollTo(0, 0)} className="inline-block cursor-pointer">
          <img
            src="/logo-transparent.png"
            alt="BizManage Logo"
            className="w-14 h-14 object-contain mx-auto mb-3 drop-shadow-2xl hover:scale-105 transition-transform"
          />
        </Link>
        <h2 className="text-2xl font-bold text-white">Set New Password</h2>
        <p className="text-sm text-slate-400 mt-1">Please enter your new password below</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
          {message} Redirection to login page...
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <input type="hidden" {...register('token')} />

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Reset Token</label>
          <input
            type="text"
            {...register('token')}
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
            placeholder="Token from email link"
          />
          {errors.token && <p className="text-xs text-red-400 mt-1">{errors.token.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
          <input
            type="password"
            {...register('newPassword')}
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
          />
          {errors.newPassword && <p className="text-xs text-red-400 mt-1">{errors.newPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
        >
          {loading ? 'Updating Password...' : 'Reset Password'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-400">
        <Link href="/login" className="text-blue-400 hover:underline font-medium">
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <Suspense fallback={<div className="text-slate-400">Loading reset form...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
