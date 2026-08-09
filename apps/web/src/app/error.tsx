'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-4">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 items-center justify-center text-red-400 font-black text-2xl">
          500
        </div>
        <h1 className="text-2xl font-bold text-white">System Error Occurred</h1>
        <p className="text-xs text-slate-400">
          An unhandled application error occurred. You can retry the action or return to sign in.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all"
          >
            Try Again
          </button>
          <Link
            href="/login"
            className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-600/25"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
