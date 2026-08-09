'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterInput } from '@bizmanage/validation';
import { useAuth } from '@/providers/AuthProvider';
import { api } from '@/lib/api';
import { Check, Sparkles, ShieldCheck, ArrowRight, ArrowLeft, Building2, Crown, Zap, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPlan, setSelectedPlan] = useState<'FREE'>('FREE');
  const [error, setError] = useState<string | null>(null);
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
      const res = await api.post('/auth/register', data);
      if (res.data.success) {
        const token = res.data.data.accessToken || res.data.data.token;
        if (token) {
          localStorage.setItem('bizmanage_token', token);
        }
        if (res.data.data.business?.id) {
          localStorage.setItem('bizmanage_active_business_id', res.data.data.business.id);
        }
        await refreshUser();
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-6 z-10">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-blue-600 items-center justify-center font-extrabold text-xl text-white mb-3 shadow-lg shadow-blue-600/30">
          BM
        </div>
        <h2 className="text-2xl font-bold text-white">Create Business Account</h2>
        <p className="text-xs text-slate-400 mt-1">Start managing your business accounting and inventory</p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-3 mb-6 z-10 text-xs font-semibold">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${step === 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-400'}`}>
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">1</span>
          <span>1. Select Subscription Plan</span>
        </div>
        <div className="w-4 h-0.5 bg-slate-800" />
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${step === 2 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-400'}`}>
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">2</span>
          <span>2. Account Details</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl z-10">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* STEP 1: SELECT SUBSCRIPTION PLAN */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/20 inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Select Your Tier
              </span>
              <h3 className="text-lg font-bold text-white mt-2">Choose Business Subscription</h3>
              <p className="text-xs text-slate-400 mt-1">Select a plan to start your tenant workspace.</p>
            </div>

            {/* FREE PLAN CARD */}
            <div
              onClick={() => setSelectedPlan('FREE')}
              className="relative p-6 rounded-2xl bg-slate-800/80 border-2 border-blue-500 shadow-xl cursor-pointer transition-all hover:bg-slate-800"
            >
              {/* Selected Badge */}
              <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                Selected • Active Plan
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <h4 className="text-base font-bold text-white">Free Starter Plan</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Full ERP access for single business shop.</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-white font-mono">Rs. 0</span>
                  <span className="text-xs text-slate-400 block font-normal">/ Forever Free</span>
                </div>
              </div>

              {/* Plan Features Checklist */}
              <div className="mt-5 pt-4 border-t border-slate-700/60 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Unlimited Sales Invoices & Purchase Bills</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Full Inventory & Real-Time Stock Tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Sales Returns (Credit Notes) & Purchase Returns (Debit Notes)</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Customer & Supplier Directory with Auto Ledgers</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Cash & Bank Multi-Account Management</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
            >
              Continue to Account Details <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: ENTER ACCOUNT DETAILS */}
        {step === 2 && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" /> Account & Business Info
              </h3>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">
                Plan: Free Plan (Rs. 0)
              </span>
            </div>

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
              <input
                type="text"
                {...register('businessName')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Kathmandu Hardware Store"
              />
              {errors.businessName && <p className="text-[10px] text-red-400 mt-1">{errors.businessName.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Account Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Min. 8 characters"
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

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Creating Business Account...' : 'Register & Launch ERP'}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 hover:underline font-semibold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
