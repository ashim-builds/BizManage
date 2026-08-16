'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

const Spinner = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f172a',
      color: '#fff',
      fontFamily: 'Inter, sans-serif',
      gap: '16px',
    }}
  >
    <div
      style={{
        width: 48,
        height: 48,
        border: '4px solid rgba(255,255,255,0.2)',
        borderTopColor: '#6366f1',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)' }}>
      Completing sign in...
    </p>
  </div>
);

// Inner component uses useSearchParams — MUST be inside <Suspense>
function OAuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (error) {
      router.replace(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!accessToken || !refreshToken) {
      router.replace('/login?error=OAuth_Missing_Token');
      return;
    }

    // Exchange URL tokens for httpOnly cookies via the API
    api
      .post('/auth/oauth-session', { accessToken, refreshToken })
      .then(() => {
        router.replace('/dashboard');
      })
      .catch(() => {
        router.replace('/login?error=OAuth_Session_Failed');
      });
  }, [router, searchParams]);

  return <Spinner />;
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <OAuthCallbackInner />
    </Suspense>
  );
}
