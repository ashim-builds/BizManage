'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePublicStorefront } from '@/hooks/useStorefront';
import { useAuth } from '@/providers/AuthProvider';
import { api } from '@/lib/api';
import {
  Store,
  User,
  Lock,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function StoreCustomerLoginPage() {
  const params = useParams();
  const router = useRouter();
  const storeSlug = (params?.storeSlug as string) || '';

  const { data: storeData } = usePublicStorefront(storeSlug);
  const { refreshUser } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const store = storeData?.store;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const res = await api.post('/auth/login', { email, password });
        if (res.data.success) {
          if (refreshUser) await refreshUser();
          toast.success(`Welcome back! Logged in as Store Customer.`);
          router.push(`/store/${storeSlug}`);
        }
      } else {
        if (!name || name.trim().length < 2 || /[0-9]/.test(name)) {
          toast.error('Full name must contain letters only and cannot contain numbers.');
          setSubmitting(false);
          return;
        }
        if (!phone || !/^9[0-9]{9}$/.test(phone.trim().replace(/[^0-9]/g, ''))) {
          toast.error('Phone number must start with 9 and be exactly 10 digits (e.g. 9841234567).');
          setSubmitting(false);
          return;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          toast.error('Please enter a valid email address.');
          setSubmitting(false);
          return;
        }

        const res = await api.post('/auth/register', {
          name: name.trim(),
          phone: phone.trim().replace(/[^0-9]/g, ''),
          email: email.trim(),
          password,
          businessName: store?.storeTitle ? `${store.storeTitle} Customer` : 'Customer Account',
        });

        if (res.data.success) {
          if (refreshUser) await refreshUser();
          toast.success(`Account created successfully! Welcome to ${store?.storeTitle || 'Online Store'}.`);
          router.push(`/store/${storeSlug}`);
        }
      }
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error('Account with this email already exists! Switched to Sign In mode.');
        setMode('login');
      } else {
        toast.error(err?.response?.data?.message || err?.response?.data?.error?.message || err?.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href={`/store/${storeSlug}`} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
              {store?.logoUrl ? (
                <img src={store.logoUrl} alt={store.storeTitle} className="w-full h-full object-contain p-1 rounded-xl" />
              ) : (
                <Store className="w-5 h-5" />
              )}
            </div>
            <div>
              <span className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors block">
                {store?.storeTitle || 'Online Storefront'}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">/store/{storeSlug}</span>
            </div>
          </Link>

          <Link
            href={`/store/${storeSlug}`}
            className="text-xs text-slate-300 hover:text-white font-semibold flex items-center gap-1 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl transition-all"
          >
            ← Back to Storefront
          </Link>
        </div>
      </header>

      {/* Main Authentication Section */}
      <main className="max-w-md mx-auto px-6 py-12 w-full flex-1 flex flex-col justify-center">
        {/* Distinction Banner: Store Customer vs Business Staff ERP */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 text-center space-y-2 shadow-lg">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <User className="w-4 h-4" />
            Online Store Customer Account
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Log in or sign up to track your online web orders, auto-fill checkout details, and receive fast order updates.
          </p>
        </div>

        {/* Auth Form Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 rounded-lg transition-all ${
                mode === 'login' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`py-2 rounded-lg transition-all ${
                mode === 'register' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              New Customer Sign Up
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value.replace(/[0-9]/g, ''))}
                      placeholder="e.g. Ramraj Adhikari"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number (10 Digits) *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                      placeholder="e.g. 9841234567"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Delivery Address (Optional)</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Pokhara-8, Srijana Chowk"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Account Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 mt-4"
            >
              {submitting ? (
                <span>Processing...</span>
              ) : mode === 'login' ? (
                <>
                  <span>Sign In to Store Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Create Customer Account</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Separation Footer Link to Staff ERP Login */}
          <div className="pt-4 border-t border-slate-800/80 text-center space-y-2">
            <p className="text-[11px] text-slate-400">
              Are you a business owner or ERP staff member?
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold hover:underline"
            >
              <Building2 className="w-3.5 h-3.5" />
              Go to Workspace Staff ERP Dashboard Login
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-800/80 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {store?.storeTitle || 'BizManage Storefront'}. All rights reserved.
      </footer>
    </div>
  );
}
