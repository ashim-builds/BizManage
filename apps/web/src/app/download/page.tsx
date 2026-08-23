'use client';

import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import {
  Download,
  Monitor,
  Zap,
  RotateCcw,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  HardDrive,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-blue-600 selection:text-white">
      <PublicHeader />

      <main className="flex-1 pt-24 pb-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-16 border-b border-slate-800/80">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> BizManage Desktop App v2.0 (2026 Edition)
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight max-w-4xl mx-auto leading-tight">
              Download BizManage for <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Windows Desktop</span>
            </h1>

            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
              Run your retail store and POS counter billing with <strong>100% Offline Support</strong>, fast hardware thermal printing, and automatic background cloud sync.
            </p>

            {/* Primary Download Card */}
            <div className="pt-6 max-w-md mx-auto">
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5 hover:border-blue-500/50 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
                      <Monitor className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base font-bold text-white">BizManage Desktop for Windows</h3>
                      <p className="text-xs text-slate-400">Windows 10 / 11 (64-bit Architecture)</p>
                    </div>
                  </div>
                </div>

                <a
                  href="/downloads/BizManage-Desktop-Setup.exe"
                  download="BizManage-Desktop-Setup.exe"
                  className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-blue-600/30 active:scale-95 group"
                >
                  <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                  Download for Windows (.EXE)
                </a>

                <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 pt-3">
                  <span>File Size: <strong>163 MB</strong></span>
                  <span>License: <strong>Free Desktop Client</strong></span>
                  <span>Version: <strong>v2.0.0</strong></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Why Use BizManage Desktop App?</h2>
            <p className="text-slate-400 text-xs sm:text-sm">Built specifically for high-volume counter billing and retail store management.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">100% Offline POS Counter Billing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Continue billing customers at the counter even if your internet, Wi-Fi, or router completely shuts down. Receipts print instantly offline.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 w-fit">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Automatic Background Sync</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                The moment internet connectivity is restored, all offline sales bills automatically push to your cloud database in the background.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
                <Printer className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Direct Thermal Printer Support</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seamless USB/COM hardware printing for 80mm &amp; 58mm thermal receipt printers with verification QR codes and barcode graphics.
              </p>
            </div>
          </div>
        </section>

        {/* Installation Instructions */}
        <section className="py-12 bg-slate-900/50 border-y border-slate-800">
          <div className="max-w-4xl mx-auto px-4 space-y-8">
            <h2 className="text-xl font-bold text-white text-center">3 Quick Steps to Install on Windows</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black flex items-center justify-center">1</div>
                <h4 className="font-bold text-white">Click Download .EXE</h4>
                <p className="text-slate-400">Click the download button above to save <code>BizManage-Desktop-Setup.exe</code>.</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black flex items-center justify-center">2</div>
                <h4 className="font-bold text-white">Run Executable</h4>
                <p className="text-slate-400">Double click the downloaded file to launch the native desktop application.</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black flex items-center justify-center">3</div>
                <h4 className="font-bold text-white">Start Counter Billing</h4>
                <p className="text-slate-400">Log in to your store account and enjoy high-speed offline counter billing!</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
