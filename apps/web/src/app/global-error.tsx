'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white min-h-screen flex items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-4">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 items-center justify-center text-red-400 font-black text-2xl">
            !
          </div>
          <h1 className="text-2xl font-bold text-white">Application Exception</h1>
          <p className="text-xs text-slate-400">
            A critical error occurred while rendering the application root.
          </p>
          <div className="pt-2">
            <button
              onClick={() => reset()}
              className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-600/25"
            >
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
