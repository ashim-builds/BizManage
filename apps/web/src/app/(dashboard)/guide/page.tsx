'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { UserGuide } from '@/components/guide/UserGuide';
import { LoadingState } from '@/components/common/LoadingState';
import { ArrowLeft, BookOpen, Settings } from 'lucide-react';

export default function GuidePage() {
  return (
    <Suspense fallback={<LoadingState message="Loading user guide..." />}>
      <div className="space-y-6 max-w-5xl mx-auto font-sans">
        {/* Breadcrumb Navigation Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all shrink-0"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                User Guide & Documentation <BookOpen className="w-5 h-5 text-blue-400" />
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete walkthrough of BizManage ERP & Billing in Nepali & English.
              </p>
            </div>
          </div>

          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 transition-all"
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </Link>
        </div>

        {/* User Guide Core Component */}
        <UserGuide initialLanguage="np" showLanguageSelector={true} />
      </div>
    </Suspense>
  );
}
