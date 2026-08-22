'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@bizmanage/validation';
import { useAuth } from '@/providers/AuthProvider';
import { api, setAccessToken } from '@/lib/api';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isSessionExpired = searchParams.get('sessionExpired') === 'true';

  // If already logged in as admin, redirect to admin dashboard
  useEffect(() => {
    if (user?.isSystemAdmin) {
      router.push('/admin/dashboard');
    } else if (user) {
      // If logged in as normal user, they shouldn't be here
      router.push('/dashboard');
    }
  }, [user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/admin-login', data);
      if (res.data.success) {
        if (res.data.data?.accessToken) {
          setAccessToken(res.data.data.accessToken);
        }
        await refreshUser();
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative background element for admin panel */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600"></div>
        
        <div className="text-center mb-8">
          <Link href="/" onClick={() => window.scrollTo(0, 0)} className="inline-block cursor-pointer">
            <img
              src="/logo-transparent.png"
              alt="BizManage Logo"
              className="w-14 h-14 object-contain mx-auto mb-3 drop-shadow-2xl hover:scale-105 transition-transform"
            />
          </Link>
          <h2 className="text-2xl font-bold text-white">System Admin</h2>
          <p className="text-sm text-slate-400 mt-1">Authorized personnel only</p>
        </div>

        {/* Session Expired Banner */}
        {isSessionExpired && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5 shadow-md animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white text-xs">Admin Session Expired (सेसन समाप्त भयो)</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">Please sign in again to access the administrator portal.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Admin Email</label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="admin@bizmanage.com"
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className="w-full px-4 py-2.5 pr-11 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In as Admin'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2 text-sm text-slate-400">
          <p>
            Not an admin?{' '}
            <Link href="/login" className="text-indigo-400 hover:underline font-medium">
              Return to regular login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-400">Loading...</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}
