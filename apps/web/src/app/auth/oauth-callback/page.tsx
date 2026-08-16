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

    if (!accessToken || !refreshToken) {
      router.replace('/login?error=OAuth_Missing_Token');
      return;
    }

    // ── Mobile-compatible auth ───────────────────────────────────────────────
    // Mobile browsers (iOS Safari, some Android) block SameSite=None cookies
    // from cross-origin requests. The old cookie-exchange approach failed silently.
    // Fix: store the token in localStorage and set the Authorization header NOW,
    // then call refreshUser() so the AuthProvider loads the user state.
    // Also fire the cookie-session exchange in background for desktop users.

    // 1. Set the token immediately so all subsequent API calls are authenticated
    setAccessToken(accessToken);

    // 2. Fire cookie exchange in background (helps desktop, ignored on mobile)
    api.post('/auth/oauth-session', { accessToken, refreshToken }).catch(() => {});

    // 3. Reload user profile via the now-authenticated API client
    refreshUser()
      .then(() => {
        router.replace('/dashboard');
      })
      .catch(() => {
        router.replace('/login?error=OAuth_Session_Failed');
      });
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
