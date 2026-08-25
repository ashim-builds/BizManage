'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, setAccessToken } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

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
  const { refreshUser } = useAuth();
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

    if (!accessToken) {
      router.replace('/login?error=OAuth_Missing_Token');
      return;
    }

    const processLogin = async () => {
      try {
        // 1. Immediately store access token in localStorage and axios headers
        setAccessToken(accessToken);

        // 2. Also attempt cookie session exchange if refreshToken exists
        if (refreshToken) {
          await api.post('/auth/oauth-session', { accessToken, refreshToken }).catch(() => {});
        }

        // 3. Refresh user state in AuthProvider
        await refreshUser();

        // 4. Navigate based on user role
        router.replace('/explore-stores');
      } catch (err) {
        router.replace('/explore-stores');
      }
    };

    processLogin();
  }, [router, searchParams, refreshUser]);

  return <Spinner />;
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <OAuthCallbackInner />
    </Suspense>
  );
}
