'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

/**
 * OAuth Callback Page
 *
 * In production (cross-domain), the API cannot set cookies that are readable
 * by the frontend because they are on different domains. Instead, the API
 * redirects here with accessToken and refreshToken as URL params.
 *
 * This page:
 * 1. Reads the tokens from the URL.
 * 2. Sends them to the API's /auth/oauth-token endpoint, which sets proper
 *    httpOnly cookies in the browser using the API domain, then redirects.
 * 3. Falls back: if no tokens, redirects to /login with an error.
 */
export default function OAuthCallbackPage() {
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

    // Exchange the URL tokens for cookies via the API
    api
      .post('/auth/oauth-session', { accessToken, refreshToken })
      .then(() => {
        router.replace('/dashboard');
      })
      .catch(() => {
        router.replace('/login?error=OAuth_Session_Failed');
      });
  }, [router, searchParams]);

  return (
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
}
