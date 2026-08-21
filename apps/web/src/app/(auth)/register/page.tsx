'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterInput } from '@bizmanage/validation';
import { useAuth } from '@/providers/AuthProvider';
import { api } from '@/lib/api';
import { E2EECrypto } from '@/lib/crypto';
import { Building2, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(searchParams.get('error') || null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setError(null);
    setLoading(true);
    try {
      // 1. Generate E2EE Keys locally before sending to server
      const keyPair = await E2EECrypto.generateKeyPair();
      const publicKey = await E2EECrypto.exportPublicKey(keyPair.publicKey);
      
      const kdfSalt = E2EECrypto.generateSalt();
      const derivedKey = await E2EECrypto.deriveKeyFromPassword(data.password, kdfSalt);
      
      const privateKeyBase64 = await E2EECrypto.exportPrivateKey(keyPair.privateKey);
      const encryptedPrivateKey = await E2EECrypto.encryptPrivateKey(privateKeyBase64, derivedKey);
      
      // 2. Attach to payload
      const payload = {
        ...data,
        publicKey,
        encryptedPrivateKey,
        kdfSalt,
      };

      const res = await api.post('/auth/register', payload);
      if (res.data.success) {
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
        <h2 className="text-2xl font-bold text-white">Create Your Workspace Account</h2>
        <p className="text-xs text-slate-400 mt-1">Register your business and launch your BMS ERP instantly</p>
      </div>

      {/* Main Registration Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl z-10">
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
            {error.replace(/_/g, ' ')}
          </div>
        )}

        <div className="mb-6 space-y-4">
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/auth/google`}
            className="w-full py-3 px-4 flex items-center justify-center gap-3 rounded-lg bg-white hover:bg-slate-50 text-slate-900 font-semibold transition-all border border-slate-200 text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              <path d="M1 1h22v22H1z" fill="none"/>
            </svg>
            Continue with Google
          </a>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-slate-800"></div>
          <span className="text-xs text-slate-500 font-medium">OR</span>
          <div className="flex-1 h-px bg-slate-800"></div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Owner Name *</label>
            <input
              type="text"
              {...register('name')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Ramesh Shrestha"
            />
            {errors.name && <p className="text-[10px] text-red-400 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="owner@business.com"
            />
            {errors.email && <p className="text-[10px] text-red-400 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Business / Firm Name *</label>
            <div className="relative">
              <input
                type="text"
                {...register('businessName')}
                className="w-full px-3.5 py-2.5 pl-9 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Kathmandu Traders & Supplies"
              />
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            {errors.businessName && <p className="text-[10px] text-red-400 mt-1">{errors.businessName.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Account Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Min. 8 characters (1 upper, 1 lower, 1 number, 1 special)"
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
            {errors.password && <p className="text-[10px] text-red-400 mt-1">{errors.password.message}</p>}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Creating Account & Workspace...' : 'Register & Create Account'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            Already registered?{' '}
            <Link href="/login" className="text-blue-400 hover:underline font-semibold">
              Sign In to Workspace
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-6 text-center text-[11px] text-slate-500 flex items-center gap-1.5 z-10">
        <ShieldCheck className="w-4 h-4 text-emerald-400" /> Secure Multi-Tenant ERP Architecture
      </div>
    </div>
  );
}
