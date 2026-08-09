'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@bizmanage/validation';
import { useAuth } from '@/providers/AuthProvider';
import { api } from '@/lib/api';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification state
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSuccessMsg, setOtpSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    setOtpSuccessMsg(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      if (res.data.success) {
        const token = res.data.data.accessToken || res.data.data.token;
        if (token) {
          localStorage.setItem('bizmanage_token', token);
        }
        if (res.data.data.businesses && res.data.data.businesses.length > 0) {
          localStorage.setItem('bizmanage_active_business_id', res.data.data.businesses[0].id);
        }
        await refreshUser();
        router.push('/dashboard');
      }
    } catch (err: any) {
      const errCode = err.response?.data?.error?.code;
      const errMsg = err.response?.data?.error?.message;
      if (errCode === 'EMAIL_NOT_VERIFIED' || err.response?.status === 403) {
        setUnverifiedEmail(data.email);
        setShowOtpStep(true);
        setError(null);
      } else {
        setError(errMsg || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOtpSuccessMsg(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email: unverifiedEmail, otp: otpCode });
      if (res.data.success) {
        const token = res.data.data.accessToken || res.data.data.token;
        if (token) {
          localStorage.setItem('bizmanage_token', token);
        }
        if (res.data.data.businesses && res.data.data.businesses.length > 0) {
          localStorage.setItem('bizmanage_active_business_id', res.data.data.businesses[0].id);
        }
        await refreshUser();
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setOtpSuccessMsg(null);
    try {
      await api.post('/auth/resend-otp', { email: unverifiedEmail });
      setOtpSuccessMsg('A new 6-digit verification code has been sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to resend verification code.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await api.get('/auth/google/url');
      if (res.data.success && res.data.data.url) {
        window.location.href = res.data.data.url;
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to initiate Google authentication.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-xl bg-blue-600 items-center justify-center font-bold text-xl text-white mb-3">
            B
          </div>
          <h2 className="text-2xl font-bold text-white">Sign in to BizManage</h2>
          <p className="text-sm text-slate-400 mt-1">Enter your credentials to access your business accounts</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {otpSuccessMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
            {otpSuccessMsg}
          </div>
        )}

        {showOtpStep ? (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              Your email address (<strong>{unverifiedEmail}</strong>) is not verified yet. A 6-digit verification code has been sent to your inbox.
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Enter 6-Digit OTP Code</label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-center tracking-widest text-lg font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123456"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
            >
              {loading ? 'Verifying Code...' : 'Verify OTP & Sign In'}
            </button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-blue-400 hover:underline font-medium"
              >
                Resend Verification Code
              </button>
              <button
                type="button"
                onClick={() => setShowOtpStep(false)}
                className="text-slate-400 hover:text-white"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          <>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full mb-6 py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white font-medium flex items-center justify-center gap-3 transition-all hover:border-slate-600"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.4 0 15.3c0 2.9.7 5.6 1.9 8l3.7-2.9c-.2-.7-.4-1.5-.4-2.3z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative mb-6 text-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
              <span className="relative px-3 bg-slate-900 text-xs text-slate-500 uppercase font-medium">Or continue with email</span>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-2.5 pr-11 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </>
        )}

        <div className="mt-6 text-center space-y-2 text-sm text-slate-400">
          <Link href="/forgot-password" className="text-slate-400 hover:text-white transition-colors block text-xs">
            Forgot your password?
          </Link>
          <p>
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-400 hover:underline font-medium">
              Register Business
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
