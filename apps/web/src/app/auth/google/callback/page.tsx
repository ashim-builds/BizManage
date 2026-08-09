'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

function GoogleCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      setError('Missing authorization code from Google.');
      return;
    }

    const processCallback = async () => {
      try {
        const res = await api.post('/auth/google/callback', { code, state: state || undefined });
        if (res.data.success) {
          const token = res.data.data.accessToken;
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
        setError(err.response?.data?.error?.message || 'Google authentication failed.');
      }
    };

    processCallback();
  }, [searchParams, router, refreshUser]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
          <div className="inline-flex w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 items-center justify-center text-red-400 font-bold text-xl mb-4">
            ✕
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Google Sign-In Error</h2>
          <p className="text-sm text-red-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-4">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <h2 className="text-lg font-semibold text-white">Verifying Google Credentials...</h2>
        <p className="text-xs text-slate-400">Authenticating identity and loading business workspace...</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">Loading Google authentication...</div>}>
      <GoogleCallbackHandler />
    </Suspense>
  );
}
