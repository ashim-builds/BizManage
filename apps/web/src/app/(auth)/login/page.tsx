'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@bizmanage/validation';
import { useAuth } from '@/providers/AuthProvider';
import { api, setAccessToken } from '@/lib/api';
import { E2EECrypto } from '@/lib/crypto';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(searchParams.get('error') || null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isSessionExpired = searchParams.get('sessionExpired') === 'true';

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
      const res = await api.post('/auth/login', data);
      if (res.data.success) {
        // Store token for mobile browsers that block cross-origin cookies
        if (res.data.data?.accessToken) {
          setAccessToken(res.data.data.accessToken);
        }

        // --- E2EE KEY UNLOCKING ---
        const user = res.data.data?.user;
        if (user?.kdfSalt && user?.encryptedPrivateKey) {
          try {
            const derivedKey = await E2EECrypto.deriveKeyFromPassword(data.password, user.kdfSalt);
            const decryptedPrivateKeyBase64 = await E2EECrypto.decryptPrivateKey(user.encryptedPrivateKey, derivedKey);
            
            // Store the decrypted private key in session storage so it survives page reloads
            sessionStorage.setItem('e2ee_private_key', decryptedPrivateKeyBase64);
            if (user.publicKey) {
              sessionStorage.setItem('e2ee_public_key', user.publicKey);
            }
          } catch (e) {
            console.error('Failed to unlock E2EE vault', e);
          }
        }

        await refreshUser();
        router.push('/dashboard');
      }
    } catch (err: any) {
      if (err.response?.data?.error?.code === 'EMAIL_NOT_VERIFIED') {
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
      } else {
        setError(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    window.location.href = `${apiUrl}/auth/google`;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-8 z-10">
        <Link href="/" onClick={() => window.scrollTo(0, 0)} className="inline-block cursor-pointer">
          <img
            src="/logo-transparent.png"
            alt="BizManage Logo"
            className="w-14 h-14 object-contain mx-auto mb-3 drop-shadow-2xl hover:scale-105 transition-transform"
          />
        </Link>
        <h2 className="text-2xl font-bold text-white">Sign In to Your Workspace</h2>
        <p className="text-xs text-slate-400 mt-1">Workspace Staff ERP Dashboard Login</p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl z-10">
        {isSessionExpired && !error && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-2">
            <span>Your session expired due to inactivity. Please sign in again.</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error === 'OAuth_Failed'
                ? 'Google Sign-In Failed'
                : error === 'Invalid_OAuth_State'
                ? 'Authentication Session Expired'
                : 'Authentication Error'}
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {error === 'OAuth_Failed'
                ? 'Could not complete Google authentication. Please sign in with your email & password, or ensure your Google OAuth callback URL is configured.'
                : error === 'Invalid_OAuth_State'
                ? 'The OAuth session timed out or was interrupted. Please try clicking Continue with Google again.'
                : error.replace(/_/g, ' ')}
            </p>
          </div>
        )}

        <div className="mb-6 space-y-4">
          <button
            type="button"
            onClick={handleGoogleAuth}
            className="w-full py-3 px-4 flex items-center justify-center gap-3 rounded-lg bg-white hover:bg-slate-50 text-slate-900 font-semibold transition-all border border-slate-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              <path d="M1 1h22v22H1z" fill="none"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-slate-800"></div>
          <span className="text-xs text-slate-400 font-medium">OR</span>
          <div className="flex-1 h-px bg-slate-800"></div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@business.com"
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className="w-full px-4 py-2.5 pr-11 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white transition-colors cursor-pointer"
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
            className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2 text-sm text-slate-300">
          <Link href="/forgot-password" className="text-slate-300 hover:text-white transition-colors block text-xs">
            Forgot your password?
          </Link>
          <p>
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-400 hover:underline font-semibold">
              Register Business
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-400">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
