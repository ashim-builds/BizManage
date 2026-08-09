'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-4">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/30 items-center justify-center text-blue-400 font-black text-2xl">
          404
        </div>
        <h1 className="text-2xl font-bold text-white">Page Not Found</h1>
        <p className="text-xs text-slate-400">
          The requested page or resource could not be found.
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-block py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-600/25"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
